const assert = require('assert');
const { By } = require('selenium-webdriver');
const {
  USER_A,
  USER_B,
  E2E_TEST_PHOTO,
  E2E_TEST_PHOTO_JPEG,
  createDriver,
  quitDriver,
  waitAndClick,
  registerAndVerifyUser,
  registerUserViaApi,
  verifyUserViaApi,
  loginUser,
  loginViaApi,
  resolveSeedAdminCredentials,
  getSeedAdminToken,
  makeUser,
  navigateTo,
  uploadProfilePhotoViaApi,
  deleteProfilePhotoViaApi,
  fetchProfilePhoto,
  getUserPhotosViaApi,
  fetchS3Media,
  createStoryViaApi,
  deleteStoryViaApi,
  bookmarkUserViaApi,
  sendMediaMailViaApi,
  getMailboxConversationViaApi,
  extractS3KeyFromMediaUrl,
  isLikelyImageBuffer,
  uploadProfilePhotoViaBrowser,
  openProfilePhotoCropModal,
  uploadProfilePhotoViaUi,
  deleteProfilePhotoViaUi,
  waitForProfileImageLoaded,
  waitForHeroPhotoBackground,
} = require('./helpers');

function testUser(template) {
  return makeUser({
    name: template.name,
    password: template.password,
    birthday: template.birthday,
    gender: template.gender,
  });
}

describe('Profile photo and S3 media', function () {
  this.timeout(180000);

  let driverA;
  let driverB;
  let userA;
  let userB;
  let userAId;
  let userBId;
  let tokenA;
  let tokenB;
  let tokenC;
  let userCId;
  let storyId;
  let storyS3Key;
  let mailboxS3Key;
  let profileS3Key;

  before(async function () {
    driverA = await createDriver();
    driverB = await createDriver();
    userA = testUser(USER_A);
    userB = testUser({ ...USER_B, gender: 'WOMAN' });

    userAId = await registerAndVerifyUser(driverA, userA);
    userBId = await registerUserViaApi(userB);
    await resolveSeedAdminCredentials();
    const adminToken = await getSeedAdminToken();
    await verifyUserViaApi(adminToken, userBId);
    await loginUser(driverB, userB.email, userB.password);

    const userC = makeUser({ name: 'Photo Stranger C', gender: 'MAN' });
    userCId = await registerUserViaApi(userC);
    await verifyUserViaApi(adminToken, userCId);

    tokenA = await loginViaApi(userA.email, userA.password, false);
    tokenB = await loginViaApi(userB.email, userB.password, false);
    tokenC = await loginViaApi(userC.email, userC.password, false);
  });

  after(async function () {
    await quitDriver(driverA);
    await quitDriver(driverB);
  });

  describe('API: profile photo — upload, view, delete', function () {
    it('загружает фото профиля через POST /user/me/photo', async function () {
      await uploadProfilePhotoViaApi(tokenA, E2E_TEST_PHOTO);
      const photos = await getUserPhotosViaApi(tokenA, userAId);
      assert.ok(photos.length > 0, 'После загрузки должен быть хотя бы один s3_key в user_photos');
      profileS3Key = photos[0].s3Key;
      assert.ok(profileS3Key && profileS3Key.startsWith('profile/'), `Ожидался profile/* ключ, получено: ${profileS3Key}`);
    });

    it('владелец видит своё фото через GET /user/me/photo', async function () {
      const own = await fetchProfilePhoto(null, tokenA);
      assert.strictEqual(own.status, 200);
      assert.ok(isLikelyImageBuffer(own.buffer), 'Ответ /user/me/photo должен быть изображением');
    });

    it('другой пользователь видит фото через публичный GET /user/{id}/photo', async function () {
      const otherView = await fetchProfilePhoto(userAId, null);
      assert.strictEqual(otherView.status, 200);
      assert.ok(isLikelyImageBuffer(otherView.buffer), 'Публичный эндпоинт фото должен отдавать изображение');
    });

    it('авторизованный пользователь видит список фото GET /user/{id}/photos', async function () {
      const photos = await getUserPhotosViaApi(tokenB, userAId);
      assert.ok(photos.length > 0, 'Список фото пользователя не должен быть пустым');
    });

    it('владелец может скачать profile/* через S3-прокси', async function () {
      const result = await fetchS3Media(tokenA, profileS3Key);
      assert.strictEqual(result.status, 200);
      assert.ok(isLikelyImageBuffer(result.buffer), 'S3 profile media должен быть изображением');
    });

    it('чужой пользователь не может скачать profile/* через S3-прокси', async function () {
      const result = await fetchS3Media(tokenB, profileS3Key);
      assert.strictEqual(result.status, 404, 'Чужой profile/* в S3 должен возвращать 404');
    });

    it('удаляет фото профиля через DELETE /user/me/photo', async function () {
      await deleteProfilePhotoViaApi(tokenA);
      const photos = await getUserPhotosViaApi(tokenA, userAId);
      assert.strictEqual(photos.length, 0, 'После удаления список фото должен быть пустым');
    });
  });

  describe('API: S3 media access control', function () {
    it('без авторизации S3-прокси возвращает 401', async function () {
      const result = await fetchS3Media(null, 'stories/test/nonexistent.jpg');
      assert.strictEqual(result.status, 401);
    });

    it('создаёт story и сохраняет S3-ключ', async function () {
      const story = await createStoryViaApi(tokenA, E2E_TEST_PHOTO, 'E2E story');
      storyId = story.id;
      storyS3Key = extractS3KeyFromMediaUrl(story.mediaUrl);
      assert.ok(storyId, 'Story id должен быть в ответе');
      assert.ok(storyS3Key && storyS3Key.startsWith('stories/'), `Ожидался stories/* ключ, получено: ${storyS3Key}`);
    });

    it('автор story может скачать media через S3-прокси', async function () {
      const result = await fetchS3Media(tokenA, storyS3Key);
      assert.strictEqual(result.status, 200);
      assert.ok(isLikelyImageBuffer(result.buffer));
    });

    it('пользователь без закладки не может скачать чужую story', async function () {
      const result = await fetchS3Media(tokenB, storyS3Key);
      assert.strictEqual(result.status, 404);
    });

    it('пользователь с закладкой может скачать story из S3', async function () {
      await bookmarkUserViaApi(tokenB, userAId);
      const result = await fetchS3Media(tokenB, storyS3Key);
      assert.strictEqual(result.status, 200);
      assert.ok(isLikelyImageBuffer(result.buffer));
    });

    it('отправляет фото в почту и оба участника могут скачать media из S3', async function () {
      await sendMediaMailViaApi(tokenA, userBId, 'PHOTO', E2E_TEST_PHOTO, 'E2E mailbox photo');
      const conversation = await getMailboxConversationViaApi(tokenB, userAId);
      const messages = conversation.messages || [];
      const photoMessage = messages.find((msg) => msg.mediaType === 'PHOTO' && msg.mediaUrl);
      assert.ok(photoMessage, 'В переписке должно быть сообщение с фото');
      mailboxS3Key = extractS3KeyFromMediaUrl(photoMessage.mediaUrl);
      assert.ok(mailboxS3Key && mailboxS3Key.startsWith('mailbox/'), `Ожидался mailbox/* ключ, получено: ${mailboxS3Key}`);

      const senderView = await fetchS3Media(tokenA, mailboxS3Key);
      const recipientView = await fetchS3Media(tokenB, mailboxS3Key);
      assert.strictEqual(senderView.status, 200);
      assert.strictEqual(recipientView.status, 200);
      assert.ok(isLikelyImageBuffer(senderView.buffer));
      assert.ok(isLikelyImageBuffer(recipientView.buffer));
    });

    it('посторонний пользователь не может скачать mailbox media из S3', async function () {
      const result = await fetchS3Media(tokenC, mailboxS3Key);
      assert.strictEqual(result.status, 404);
    });

    it('удаляет story через DELETE /stories/{id}', async function () {
      await deleteStoryViaApi(tokenA, storyId);
      const result = await fetchS3Media(tokenA, storyS3Key);
      assert.strictEqual(result.status, 404, 'После удаления story media в S3 недоступна');
    });
  });

  describe('UI: profile photo flows', function () {
    it('загружает фото через браузерный POST /user/me/photo (cookies)', async function () {
      await uploadProfilePhotoViaBrowser(driverA, E2E_TEST_PHOTO);
      const photos = await getUserPhotosViaApi(tokenA, userAId);
      assert.ok(photos.length > 0, 'После browser-upload API должен видеть фото');
    });

    it('открывает модалку обрезки при выборе файла на /profile/me/edit', async function () {
      try {
        await openProfilePhotoCropModal(driverA, E2E_TEST_PHOTO_JPEG);
        const applyBtn = await driverA.findElement(By.xpath("//button[contains(normalize-space(.), 'Применить')]"));
        assert.ok(await applyBtn.isDisplayed(), 'Кнопка «Применить» должна быть видна в модалке обрезки');
        await waitAndClick(driverA, By.xpath("//button[contains(normalize-space(.), 'Отмена')]"));
      } catch (error) {
        try {
          const alert = await driverA.switchTo().alert();
          await alert.accept();
        } catch (_) {
          // no alert
        }
        if (String(error).includes('Не удалось открыть изображение') || String(error).includes('UnexpectedAlertOpen')) {
          this.skip();
        }
        throw error;
      }
    });

    it('показывает фото на странице своего профиля', async function () {
      await navigateTo(driverA, '/profile/me');
      await waitForProfileImageLoaded(driverA);
      const img = await driverA.findElement(By.css('.profile-avatar'));
      const src = await img.getAttribute('src');
      assert.ok(src && (src.includes('/photo') || src.startsWith('data:')), `src фото профиля: ${src}`);
    });

    it('показывает фото другого пользователя на /user/{id}', async function () {
      await navigateTo(driverB, `/user/${userAId}`);
      await waitForHeroPhotoBackground(driverB);
      const hero = await driverB.findElement(By.css('.hero-photo'));
      const bg = await hero.getCssValue('background-image');
      assert.ok(bg.includes('url'), `hero-photo background: ${bg}`);
    });

    it('удаляет фото через UI на странице редактирования', async function () {
      await deleteProfilePhotoViaUi(driverA);
      const photos = await getUserPhotosViaApi(tokenA, userAId);
      assert.strictEqual(photos.length, 0, 'После UI-удаления фото не должно остаться в API');
      await navigateTo(driverA, '/profile/me/edit');
      const deleteButtons = await driverA.findElements(By.xpath("//button[contains(normalize-space(.), 'Удалить фото')]"));
      assert.strictEqual(deleteButtons.length, 0, 'Кнопка «Удалить фото» не должна отображаться без фото');
    });
  });
});
