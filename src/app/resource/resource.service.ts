// Imports from @angular
import { Http, Headers, Response, RequestOptions } from '@angular/http';
import { Injectable } from '@angular/core';
// RxJS
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
// Interfaces
import { ResourceInterface, ResourceConfigInterface } from './resource.interface';

export const BaseResourceConfig: ResourceConfigInterface = {
  requestOptions: new RequestOptions({
    headers: new Headers({
      'content-type': 'application/json',
      'accept': 'application/json',
    })
  }),
  auth: false,
  tokenPropertyName: 'accessToken'
};

@Injectable()
export class ResourceService implements ResourceInterface {
  resourceConfig = BaseResourceConfig;
  private baseUrl: string;

  constructor(
    protected http: Http
  ) { }

  set url(url: string) { this.baseUrl = url; }
  get url() { return this.baseUrl; }

  authenticate() {
    const token = localStorage.getItem(this.resourceConfig.tokenPropertyName);
    if (this.resourceConfig.auth && token) {
      this.resourceConfig.requestOptions.headers.append('x-access-token', token);
    }
  }

  query(ids: any = {}, config: ResourceConfigInterface = {}): Observable<any> {
    let url = this.makeUrl(ids);
    url += config.hasOwnProperty('urlSuffix') ? config.urlSuffix : '';
    url += config.hasOwnProperty('params') ? this.makeQueryString(config['params']) : '';
    const reqOpts = config.requestOptions || this.resourceConfig.requestOptions;
    return this.http.get(url, reqOpts)
                    .map((res: Response) => res.json());
  }

  get() {}

  save() {}

  update() {}

  delete() {}

  makeUrl(obj) {
    let url = this.baseUrl;
    const params = url.match(/:\w+/g);
    if (!params) { return url; }

    params.forEach(param => {
      const key = param.substring(1, param.length);
      url = obj.hasOwnProperty(key) ?
            url.replace(param, obj[key]) :
            url.replace('/' + param, '');
    });

    return url;
  }

  makeQueryString(obj) {
    return Object
      .keys(obj)
      .reduce((prev, curr) => {
        return obj[curr] ?
          Array.isArray(obj[curr]) && obj[curr].length > 0 ?
            `${prev}&${encodeURIComponent(curr)}=${obj[curr].join(',')}`
          : !Array.isArray(obj[curr]) ?
            `${prev}&${encodeURIComponent(curr)}=${encodeURIComponent(obj[curr])}`
          : prev
        : prev;
      }, '?')
      .replace('?&', '?');
  }

}
