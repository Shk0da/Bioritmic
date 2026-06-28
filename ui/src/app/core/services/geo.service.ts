import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GeoCountry {
  code: string;
  name: string;
}

export interface GeoPlace {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  countryCode: string;
  type: string;
}

export interface GeoLocationDetails {
  countryCode: string | null;
  countryName: string | null;
  placeName: string | null;
  displayName: string | null;
  lat: number;
  lon: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeoService {
  private readonly apiUrl = '/api/v1/geo';

  constructor(private http: HttpClient) {}

  getCountries(): Observable<GeoCountry[]> {
    return this.http.get<GeoCountry[]>(`${this.apiUrl}/countries`);
  }

  searchPlaces(countryCode: string, query: string): Observable<GeoPlace[]> {
    const params = new HttpParams()
      .set('country', countryCode)
      .set('q', query);
    return this.http.get<GeoPlace[]>(`${this.apiUrl}/places`, { params });
  }

  reverseGeocode(lat: number, lon: number): Observable<GeoLocationDetails> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString());
    return this.http.get<GeoLocationDetails>(`${this.apiUrl}/reverse`, { params });
  }
}
