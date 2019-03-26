var header = $("meta[name='_csrf_header']").attr("content");
var token = $("meta[name='_csrf']").attr("content");

var limit = 20;
var smfPage = 0;
var smnPage = 0;
var currentFeedIdent = 0;
var searchMode = false;
var sortField = 'id';
var sortType = 'desc';
var sort = 'feed';

var article = $("#article");
var sorter = $(".sorter");
var sorterNews = $(".sorterNews");
var search = $("#search");
var go = $("#go");
var back = $("#back");
var addNew = $("#addNew");
var smf = $("#smf");
var smn = $("#smn");
var feeds = $("#feeds");
var newst = $("#news");
var feedList = $("#feedList");
var newsList = $("#newsList");
var line1 = $("#line1");
var line2 = $("#line2");

addNew.click(function () {
    var adnf = $("#addNewFeed");
    adnf.attr('title', 'Add new Feed');
    dialogAndSaveForm(adnf);
    adnf.find('form').find("input[type=text], textarea").val("");
});

back.click(function () {
    addNew.removeClass("hidden");
    feeds.removeClass("hidden");
    search.addClass("hidden");
    newst.addClass("hidden");
    back.addClass("hidden");
    newsList.empty();
    smnPage = 0;
    searchMode = false;
});

sorter.click(function () {
    sortField = $(this).attr('data-sort');
    if (sortType === 'desc') sortType = 'asc';
    else if (sortType === 'asc') sortType = 'desc';
    sort = 'feed';
    smfPage = 0;
    feedList.empty();
    updateFeedList();
});

sorterNews.click(function () {
    sortField = $(this).attr('data-sort');
    if (sortType === 'desc') sortType = 'asc';
    else if (sortType === 'asc') sortType = 'desc';
    sort = 'news';
    smnPage = 0;
    newsList.empty();
    news(currentFeedIdent);
});

smn.click(function () {
    news(smn.attr("ident"));
});

smf.click(function () {
    updateFeedList();
});

go.click(function () {
    searchMode = true;
    smnPage = 0;
    newsList.empty();
    var searchRow = search.find('input[type="text"]').val();
    news(currentFeedIdent, searchRow);
});

function news(id, searchRow) {
    if (searchMode === true && !searchRow) {
        searchRow = search.find('input[type="text"]').val();
    }
    smn.attr("ident", id);
    currentFeedIdent = id;
    var url = '/api/news-feeds/' + id + '/news?';
    if (searchRow !== null && searchRow !== '' && searchRow !== undefined) {
        url = '/api/news-feeds/' + id + '/news/search?title=' + searchRow;
    }
    url += '&size=' + limit + '&page=' + smnPage++;
    if (sort === 'news') {
        url += '&sort='+sortField+','+sortType;
    }
    $.get(url, function (data) {
        var totalElements = data.totalElements;
        var numberOfElements = data.numberOfElements;
        var content = data.content;

        feeds.addClass("hidden");
        addNew.addClass("hidden");
        search.removeClass("hidden");
        newst.removeClass("hidden");
        back.removeClass("hidden");
        $.each(content, function (i, item) {
            var $tr = $('<tr style="height: 30px" id="news' + item.id + '">').append(
                $('<td>').text(item.id),
                $('<td>').html((item.imgUrl ? '<img class="img-circle" src="' + item.imgUrl + '" width=50 />' : '')),
                $('<td>').text(item.title),
                $('<td>').text(item.datetime ? getDateStr(item.datetime) : '-'),
                $('<td>').html('<a onclick="show(\'' + item.title + '\', ' + item.datetime + ', \'' + item.content + '\')">show</a>')
            );
            $tr.appendTo(newsList);
        });

        if (totalElements > limit) smn.removeClass("hidden");
        if (numberOfElements == 0) smn.addClass("hidden");
    });
}

function updateFeedList() {
    var url = "/api/news-feeds?size=" + limit + "&page=" + smfPage++;
    if (sort === 'feed') {
        url += '&sort=' + sortField + ',' + sortType;
    }
    $.get(url, function (data) {
        var totalElements = data.totalElements;
        var numberOfElements = data.numberOfElements;
        var content = data.content;
        if (numberOfElements > 0) {
            updateTable(feedList, content);
        }

        if (totalElements > limit) smf.removeClass("hidden");
        if (numberOfElements == 0) smf.addClass("hidden");
    });
}

function edit(id) {
    var feed = $("#feed" + id);
    var adnf = $("#addNewFeed");
    adnf.attr('title', 'Update Feed');
    adnf.find('form').find("input[type=text], textarea").val("");
    adnf.find('input[name="id"]').val(id);
    adnf.find('input[name="name"]').val(feed.find('.name').html());
    adnf.find('input[name="url"]').val(feed.find('.url').html());
    adnf.find('select[name="type"]').val(feed.find('.type').html());
    adnf.find('input[name="checkFrequency"]').val(feed.find('.checkFrequency').html());
    adnf.find('input[name="titleTag"]').val(feed.attr('tag-title'));
    adnf.find('input[name="articleTag"]').val(feed.attr('tag-article'));
    adnf.find('input[name="datetimeTag"]').val(feed.attr('tag-datetime'));
    if (feed.find('.fa').hasClass('fa-check')) {
        adnf.find('input[name="enabled"]').attr('checked', 'checked');
    } else {
        adnf.find('input[name="enabled"]').attr('checked', '');

    }

    dialogAndSaveForm(adnf);
}

function show(title, datetime, content) {
    article.find(".title").text(title ? title : '');
    article.find(".datetime").text(datetime ? getDateStr(datetime) : '');
    article.find(".content").text(content ? content : '');
    article.removeClass('hidden');
    article.dialog({
        modal: true,
        height: ($(window).height() / 2),
        width: ($(window).width() / 2),
        buttons: {
            Ok: function () {
                $(this).dialog("close");
                article.addClass('hidden');
            }
        }
    });
}

function remove(id) {
    $.ajax({
        url: '/api/news-feeds/' + id,
        type: 'DELETE',
        beforeSend: function (xhr) {
            xhr.setRequestHeader(header, token);
        },
        success: function () {
            $("#feed" + id).remove();
        }
    });
}

function dialogAndSaveForm(form) {
    form.removeClass('hidden');
    form.dialog({
        width: 350,
        buttons: {
            submit: function () {
                var data = {};
                var hasErrors = false;
                $(this).find('form').serializeArray().map(function (x) {
                    if (['name', 'url', 'checkFrequency'].includes(x.name) && (x.value === '' || x.value === null)) {
                        $('input[name="' + x.name + '"]').addClass("ui-state-error");
                        hasErrors = true;
                    }

                    if (x.name === 'enabled' && x.value === 'on') {
                        data[x.name] = true;
                    } else {
                        data[x.name] = x.value;
                    }
                });
                if (hasErrors) return;
                $.ajax({
                    url: '/api/news-feeds',
                    data: JSON.stringify(data),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    type: 'POST',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader(header, token);
                    },
                    success: function () {
                        location.reload();
                    },
                    error: function (data) {
                        try {
                            toastr.error(data.responseJSON.message);
                        } catch (err) {
                            toastr.error('Don\'t saved. Check your data.');
                        }
                    }
                });

                $(this).dialog("close");
                form.addClass('hidden');
            },
            cancel: function () {
                $(this).dialog("close");
                form.addClass('hidden');
            }
        },
        close: function () {
        }
    });
}


function updateTable(feed, content) {
    $.each(content, function (i, item) {
        var $tr = $('<tr id="feed' + item.id + '" tag-title="' + (item.titleTag ? item.titleTag : '') + '"' +
            ' tag-datetime="' + (item.datetimeTag ? item.datetimeTag : '') + '"' +
            ' tag-article="' + (item.articleTag ? item.articleTag : '') + '">').append(
            $('<td class="id">').text(item.id),
            $('<td class="name">').text(item.name),
            $('<td class="type">').text(item.type),
            $('<td class="url">').text(item.url),
            $('<td class="checkFrequency">').text(item.checkFrequency),
            $('<td class="enable">').html("<i class=\"fa " + ((item.enabled == true) ? "fa-check text-navy" : "fa-close text-warning") + "\"></i>"),
            $('<td>').html('<a onclick="news(' + item.id + ')">news</a>' +
                ' <a onclick="edit(' + item.id + ')">edit</a>' +
                ' <a onclick="remove(' + item.id + ')">delete</a>')
        );
        $tr.appendTo(feed);
    });
}

function getDateStr(timestamp) {
    var a = new Date(timestamp);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    return (date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec);
}

function updateWidget() {
    $.get("/api/news-feeds", function (data) {
        var totalElements = data.totalElements;
        var numberOfElements = data.numberOfElements;
        var content = data.content;

        $("#widget h2:contains('{{totalFeeds}}')").html(totalElements);

        $.get("/api/news-feeds/total-news", function (totalNews) {
            $("#widget h2:contains('{{totalNews}}')").html(totalNews);

            var sum = totalElements + totalNews;
            if (sum > 0) {
                line1.css("width", totalElements * 100 / sum + "%");
                line2.css("width", totalNews * 100 / sum + "%");
            } else {
                line1.css("width", 0);
                line2.css("width", 0);
            }
        });

        if (numberOfElements > 0) {
            feedList.empty();
            updateTable(feedList, content);
        }

        if (totalElements > limit) smf.removeClass("hidden");
        if (numberOfElements == 0) smf.addClass("hidden");
    });

    $.ajax({
        cache: false,
        url: "/api/news-feeds/last-update",
        success: function (data) {
            $("#widget span:contains('{{lastUpdate}}')").html(getDateStr(data));
        },
        error: function (xhr, ajaxOptions, thrownError) {
            if (xhr.status == 404) {
                $("#widget span:contains('{{lastUpdate}}')").html('never');
            }
        }
    });
}

$(document).ready(function () {
    updateWidget();
});
