import { TestBed } from '@angular/core/testing';
import { ToastService, Toast } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('success', () => {
    it('should add a success toast', (done) => {
      service.success('OK');
      service.toasts$.subscribe(toasts => {
        if (toasts.length === 1) {
          expect(toasts[0].message).toBe('OK');
          expect(toasts[0].type).toBe('success');
          done();
        }
      });
    });
  });

  describe('error', () => {
    it('should add an error toast', (done) => {
      service.error('Fail');
      service.toasts$.subscribe(toasts => {
        if (toasts.length === 1) {
          expect(toasts[0].type).toBe('error');
          expect(toasts[0].message).toBe('Fail');
          done();
        }
      });
    });
  });

  describe('info', () => {
    it('should add an info toast', (done) => {
      service.info('Info msg');
      service.toasts$.subscribe(toasts => {
        if (toasts.length === 1) {
          expect(toasts[0].type).toBe('info');
          done();
        }
      });
    });
  });

  describe('warning', () => {
    it('should add a warning toast', (done) => {
      service.warning('Warn msg');
      service.toasts$.subscribe(toasts => {
        if (toasts.length === 1) {
          expect(toasts[0].type).toBe('warning');
          done();
        }
      });
    });
  });

  describe('remove', () => {
    it('should remove toast by id', (done) => {
      service.success('s1');
      service.success('s2');
      let first = true;
      service.toasts$.subscribe(toasts => {
        if (first && toasts.length === 2) {
          first = false;
          service.remove(toasts[0].id);
        } else if (!first && toasts.length === 1) {
          expect(toasts[0].message).toBe('s2');
          done();
        }
      });
    });
  });

  describe('clear', () => {
    it('should clear all toasts', (done) => {
      service.success('a');
      service.error('b');
      let step = 0;
      service.toasts$.subscribe(toasts => {
        if (step === 0 && toasts.length === 2) {
          step = 1;
          service.clear();
        } else if (step === 1 && toasts.length === 0) {
          expect(toasts.length).toBe(0);
          done();
        }
      });
    });
  });

  describe('auto-remove', () => {
    it('should auto-remove toast after duration', (done) => {
      jasmine.clock().install();
      service.success('auto', 100);
      service.toasts$.subscribe(toasts => {
        if (toasts.length === 1) {
          jasmine.clock().tick(200);
          expect(service['toastsSubject'].value.length).toBe(0);
          jasmine.clock().uninstall();
          done();
        }
      });
    });
  });
});
