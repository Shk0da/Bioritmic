import { ModalService, ModalConfig } from './modal.service';

describe('ModalService', () => {
  let service: ModalService;

  beforeEach(() => {
    service = new ModalService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getModalSubject', () => {
    it('should return null initially', () => {
      expect(service.getModalSubject()).toBeNull();
    });
  });

  describe('close', () => {
    it('should dispatch modal:close event and clear subject', (done) => {
      service['modalSubject'] = { config: {} } as any;
      const handler = () => {
        window.removeEventListener('modal:close', handler);
        expect(service.getModalSubject()).toBeNull();
        done();
      };
      window.addEventListener('modal:close', handler);
      service.close();
    });
  });

  describe('show', () => {
    it('should resolve true on confirm via event', (done) => {
      const config: ModalConfig = { title: 'Test', message: 'Hello', confirmText: 'OK' };
      let capturedDetail: any;

      const showHandler = (e: any) => {
        window.removeEventListener('modal:show', showHandler);
        capturedDetail = e.detail;
        capturedDetail.onConfirm();
      };
      window.addEventListener('modal:show', showHandler);

      service.show(config).then(result => {
        expect(result).toBeTrue();
        expect(capturedDetail.config.title).toBe('Test');
        done();
      });
    });

    it('should resolve false on cancel via event', (done) => {
      const config: ModalConfig = { title: 'T', message: 'M', cancelText: 'Cancel' };

      const showHandler = (e: any) => {
        window.removeEventListener('modal:show', showHandler);
        e.detail.onCancel();
      };
      window.addEventListener('modal:show', showHandler);

      service.show(config).then(result => {
        expect(result).toBeFalse();
        done();
      });
    });
  });

  describe('confirm', () => {
    it('should show confirm dialog and resolve on confirm', (done) => {
      const showHandler = (e: any) => {
        window.removeEventListener('modal:show', showHandler);
        expect(e.detail.config.title).toBe('Подтверждение');
        expect(e.detail.config.icon).toBe('question');
        e.detail.onConfirm();
      };
      window.addEventListener('modal:show', showHandler);

      service.confirm('Are you sure?').then(result => {
        expect(result).toBeTrue();
        done();
      });
    });
  });

  describe('alert', () => {
    it('should show info alert and resolve on confirm', (done) => {
      const showHandler = (e: any) => {
        window.removeEventListener('modal:show', showHandler);
        expect(e.detail.config.icon).toBe('info');
        expect(e.detail.config.cancelText).toBeUndefined();
        e.detail.onConfirm();
      };
      window.addEventListener('modal:show', showHandler);

      service.alert('Info message').then(() => {
        expect(service.getModalSubject()).toBeNull();
        done();
      });
    });
  });
});
