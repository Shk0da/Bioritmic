import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { GeoService } from './geo.service';

describe('GeoService', () => {
  let service: GeoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GeoService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GeoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load countries', () => {
    service.getCountries().subscribe((countries) => {
      expect(countries.length).toBe(1);
      expect(countries[0].code).toBe('RU');
    });

    const req = httpMock.expectOne('/api/v1/geo/countries');
    expect(req.request.method).toBe('GET');
    req.flush([{ code: 'RU', name: 'Россия' }]);
  });

  it('should search places by country and query', () => {
    service.searchPlaces('RU', 'Мос').subscribe((places) => {
      expect(places[0].name).toBe('Москва');
    });

    const req = httpMock.expectOne((request) =>
      request.url === '/api/v1/geo/places' &&
      request.params.get('country') === 'RU' &&
      request.params.get('q') === 'Мос'
    );
    req.flush([{
      name: 'Москва',
      displayName: 'Москва, Москва',
      lat: 55.7558,
      lon: 37.6173,
      countryCode: 'RU',
      type: 'city'
    }]);
  });
});
