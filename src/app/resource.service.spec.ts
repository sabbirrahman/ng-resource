// Imports from @angular
import { BaseRequestOptions, RequestOptions, ResponseOptions } from '@angular/http';
import { TestBed, inject, fakeAsync, tick } from '@angular/core/testing';
import { MockBackend } from '@angular/http/testing';
import { Http, Response } from '@angular/http';
// The Test Service
import { ResourceService, BaseResourceConfig } from './resource.service';

const backendResponse = (c, b) => {
  return c.mockRespond(new Response(<ResponseOptions>{ body: JSON.stringify(b) }));
};

let backend: MockBackend;
let service: ResourceService;

const XHR_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
const arrResponse = [{ id: 123, text: 'abc' }, { id: 321, text: 'def' }];
const singleResponse = { id: 123, text: 'abc' };

describe('ResourceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BaseRequestOptions,
        ResourceService,
        MockBackend, {
          provide: Http,
          useFactory: (mockBackend, options) => new Http(mockBackend, options),
          deps: [MockBackend, BaseRequestOptions]
        }
      ]
    });
    backend = TestBed.get(MockBackend);
    service = TestBed.get(ResourceService);
  });

  it('should have the REST methods (query, get, save, update & delete)', () => {
    expect(service.query).toBeDefined();
    expect(service.get).toBeDefined();
    expect(service.save).toBeDefined();
    expect(service.update).toBeDefined();
    expect(service.delete).toBeDefined();
  });

  it('should set and get private property baseUrl', () => {
    service.url = 'http://api.example.com/post/:id';
    expect(service.url).toBe('http://api.example.com/post/:id');
  });

  it('should add x-access-token header if authentication is true and jwt token exist in localStorage', () => {
    service.authenticate();
    expect(service.resourceConfig.requestOptions.headers.has('x-access-token')).toBeFalsy();
    BaseResourceConfig.auth = true;
    service.authenticate();
    expect(service.resourceConfig.requestOptions.headers.has('x-access-token')).toBeFalsy();
    localStorage.setItem('accessToken', 'fake.jwt.token');
    service.authenticate();
    expect(service.resourceConfig.requestOptions.headers.has('x-access-token')).toBeTruthy();
    localStorage.removeItem('accessToken');
  });

  it('should take a base url and create REST method specific url', () => {
    service.url = 'v3/api/posts';
    expect(service.makeUrl({})).toBe('v3/api/posts');
    service.url = 'v3/api/posts/:id';
    expect(service.makeUrl({})).toBe('v3/api/posts');
    expect(service.makeUrl({ id: 123 })).toBe('v3/api/posts/123');
    service.url = 'v3/api/posts/:id/comments/:commentId';
    expect(service.makeUrl({ id: 123 })).toBe('v3/api/posts/123/comments');
    expect(service.makeUrl({ id: 123, commentId: 321 })).toBe('v3/api/posts/123/comments/321');
  });

  it('should make a query string from given object', () => {
    const obj = {
      limit: 10,
      pageNumber: 1,
      keywords: ['android', 'iOS', 'Windows'],
      ignore: '',
      list: []
    };
    const queryString = service.makeQueryString(obj);
    expect(queryString).toBe('?limit=10&pageNumber=1&keywords=android,iOS,Windows');
  });

  describe('should use the REST methods including', () => {
    describe('query method which should return an array', () => {
      it('for basic query request', () => {
        backend.connections.subscribe(c => {
          expect(XHR_METHODS[c.request.method]).toBe('GET');
          expect(c.request.url).toBe('v3/posts');
          backendResponse(c, arrResponse);
        });
        service.url = 'v3/posts/:id';
        service.query().subscribe();
      });

      it('for request with query parameters and url suffix', () => {
        backend.connections.subscribe(c => {
          expect(XHR_METHODS[c.request.method]).toBe('GET');
          expect(c.request.url).toBe('v3/posts/123/comments/mock?pageNo=1');
          backendResponse(c, arrResponse);
        });
        service.url = 'v3/posts/:id/comments/:commentId';
        service.query({ id: 123 }, { urlSuffix: '/mock', params: { pageNo: 1} })
          .subscribe((res) => {
            expect(res.length).toBe(2);
            expect(res[0].id).toBe(123);
            expect(res[1].text).toBe('def');
          });
      });
    });

    describe('get method which should return a single object', () => {
      it('for basic query request', () => {
        backend.connections.subscribe(c => {
          expect(XHR_METHODS[c.request.method]).toBe('GET');
          expect(c.request.url).toBe('v3/posts/123');
          backendResponse(c, singleResponse);
        });
        service.url = 'v3/posts/:id';
        service.get({ id: 123 }).subscribe((res) => {
          expect(res.id).toBe(123);
          expect(res.text).toBe('abc');
        });
      });

      it('for request with query parameters and url suffix', () => {
        backend.connections.subscribe(c => {
          expect(XHR_METHODS[c.request.method]).toBe('GET');
          expect(c.request.url).toBe('v3/posts/123/mock?pageNo=1');
          backendResponse(c, singleResponse);
        });
        service.url = 'v3/posts/:id';
        service.get({ id: 123 }, { urlSuffix: '/mock', params: { pageNo: 1} })
          .subscribe((res) => {
            expect(res.id).toBe(123);
            expect(res.text).toBe('abc');
          });
      });
    });

    describe('save method which should send data to be created to server', () => {
      it('for basic save request', () => {
        backend.connections.subscribe(c => {
          expect(XHR_METHODS[c.request.method]).toBe('POST');
          expect(JSON.parse(c.request._body).text).toBe('abcdef');
          expect(c.request.url).toBe('v3/posts');
        });
        service.url = 'v3/posts/:id';
        service.save({ text: 'abcdef' }).subscribe();
      });

      it('for request with query parameters and url suffix', () => {
        backend.connections.subscribe(c => {
          expect(XHR_METHODS[c.request.method]).toBe('POST');
          expect(JSON.parse(c.request._body).text).toBe('ghijkl');
          expect(c.request.url).toBe('v3/posts/123/mock?pageNo=1');
          backendResponse(c, singleResponse);
        });
        service.url = 'v3/posts/:id';
        service.save({ text: 'ghijkl' }, { id: 123 }, { urlSuffix: '/mock', params: { pageNo: 1} })
          .subscribe();
      });
    });

    describe('update method which should send data to be updated to server', () => {
      it('for basic update request', () => {
        backend.connections.subscribe(c => {
          expect(XHR_METHODS[c.request.method]).toBe('PUT');
          expect(JSON.parse(c.request._body).text).toBe('abcdef');
          expect(c.request.url).toBe('v3/posts/123');
        });
        service.url = 'v3/posts/:id';
        service.update({ text: 'abcdef' }, { id: 123 }).subscribe();
      });

      it('for request with query parameters and url suffix', () => {
        backend.connections.subscribe(c => {
          expect(XHR_METHODS[c.request.method]).toBe('PUT');
          expect(JSON.parse(c.request._body).text).toBe('ghijkl');
          expect(c.request.url).toBe('v3/posts/123/mock?pageNo=1');
          backendResponse(c, singleResponse);
        });
        service.url = 'v3/posts/:id';
        service.update({ text: 'ghijkl' }, { id: 123 }, { urlSuffix: '/mock', params: { pageNo: 1} })
          .subscribe();
      });
    });

    describe('delete method which should delete a data', () => {
      it('for basic delete request', () => {
        backend.connections.subscribe(c => {
          expect(XHR_METHODS[c.request.method]).toBe('DELETE');
          expect(c.request.url).toBe('v3/posts/123');
        });
        service.url = 'v3/posts/:id';
        service.delete({ id: 123 }).subscribe();
      });

      it('for request with query parameters and url suffix', () => {
        backend.connections.subscribe(c => {
          expect(XHR_METHODS[c.request.method]).toBe('DELETE');
          expect(c.request.url).toBe('v3/posts/123/mock?pageNo=1');
          backendResponse(c, singleResponse);
        });
        service.url = 'v3/posts/:id';
        service.delete({ id: 123 }, { urlSuffix: '/mock', params: { pageNo: 1} })
          .subscribe();
      });
    });
  });

  describe('search method should provide easy searching', () => {
    it('for basic delete request', () => {
      backend.connections.subscribe(c => {
        expect(XHR_METHODS[c.request.method]).toBe('GET');
        expect(c.request.url).toBe('v3/posts/search');
      });
      service.url = 'v3/posts/:id';
      service.search().subscribe();
    });

    it('for request with query parameters and url suffix', () => {
      backend.connections.subscribe(c => {
        expect(XHR_METHODS[c.request.method]).toBe('GET');
        expect(c.request.url).toBe('v3/posts/search?pageNo=1');
        backendResponse(c, singleResponse);
      });
      service.url = 'v3/posts/:id';
      service.search({ params: { pageNo: 1} })
        .subscribe();
    });
  });

  describe('count method should data count', () => {
    it('for basic delete request', () => {
      backend.connections.subscribe(c => {
        expect(XHR_METHODS[c.request.method]).toBe('GET');
        expect(c.request.url).toBe('v3/posts/count');
        backendResponse(c, 100);
      });
      service.url = 'v3/posts/:id';
      service.count().subscribe(res => expect(res).toBe(100));
    });

    it('for request with query parameters and url suffix', () => {
      backend.connections.subscribe(c => {
        expect(XHR_METHODS[c.request.method]).toBe('GET');
        expect(c.request.url).toBe('v3/posts/count?pageNo=1');
        backendResponse(c, 1200);
      });
      service.url = 'v3/posts/:id';
      service.count({ params: { pageNo: 1} })
        .subscribe(res => expect(res).toBe(1200));
    });
  });

});