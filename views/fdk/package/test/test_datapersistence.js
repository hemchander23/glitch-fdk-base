'use strict';

const expect = require('chai').expect;
const httpUtil = require('../lib/utils/http-util');
const request = require('supertest');
const pjson = require('../package.json');
const tmp = require('tmp');

global.pjson = pjson;

describe('Persistence test', () => {
  let projDir, server;

  const db = require(__dirname + '/../lib/event_handler/features/db');

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
    require(__dirname + '/../lib/manifest').reload();
  });

  beforeEach(() => {
    server = require('../lib/cli/run').run();
  });

  afterEach(() => {
    server.close();
  });

  it('should store', (done) => {
    const payload = {
      data : {
        info : 'hello world'
      },
      dbKey : 'user1',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.created, done);
  });

  it('should not fail store - 201', (done) => {
    const payload = {
      data : {
        one: []
      },
      dbKey : 'user1',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.created, done);
  });

  it('should not fail store - 201', (done) => {
    const payload = {
      data : {
        one: ''
      },
      dbKey : 'user1',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.created, done);
  });

  it('should fail store - blank data - 400', (done) => {
    const payload = {
      dbKey : 'user1',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.bad_request, done);
  });

  it('should fail store - data is greater than 4096', (done) => {
    const MAX_SIZE = 8196;
    const payload = {
      data : {
        'hello': new Array(MAX_SIZE).fill('1').join('')
      },
      dbKey : 'user1',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.bad_request, done);
  });

  it('should fetch', (done) => {
    const payload = {
      dbKey : 'user1',
      action : 'fetch'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.ok, done);
  });

  it('should fail fetch - 404', (done) => {
    const payload = {
      dbKey : 'user11311111111',
      action : 'fetch'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.not_found, done);
  });

  it('should delete', (done) => {
    const payload = {
      dbKey : 'user2',
      action : 'delete'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.ok, done);
  });

  it('should not fail - missing key', (done) => {
    const payload = {
      data : {
        'info' : 'hello world'
      },
      dbKey : '',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.bad_request, done);
  });

  it('should fail - key length > 30', (done) => {
    const payload = {
      data : {
        'info' : 'hello world'
      },
      dbKey : 'abcdefghijklmnopqrstuvwxyz12345678900987',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.bad_request, done);
  });

  it('should fail - key within data length > 30', (done) => {
    const payload = {
      data : {
        'abcdefghijklmnopqrstuvwxyz12345678900987abcdefghijklmnopqrstuvwxyz12345678900987npm' : 'hello world'
      },
      dbKey : 'hello',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.bad_request, done);
  });

  it('should not fail - 11 keys', (done) => {
    const payload = {
      data : {
        'info1' : 'hello world',
        'info2' : 'hello world',
        'info3' : 'hello world',
        'info4' : 'hello world',
        'info5' : 'hello world',
        'info6' : 'hello world',
        'info7' : 'hello world',
        'info8' : 'hello world',
        'info9' : 'hello world',
        'info10' : 'hello world',
        'info11' : 'hello world'
      },
      dbKey : 'user3',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.created, done);
  });

  it('should fail - data must be json', (done) => {
    const payload = {
      data : 'hello world',
      dbKey : 'user3',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.unprocessable_entity, done);
  });

  it('should fail - set if can take only two values exist ot not_exist', (done) => {
    const payload = {
      data : {name: 'hello world'},
      dbKey : 'user3',
      action : 'store',
      options: {
        setIf : 'random'
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.unprocessable_entity, done);
  });

  it('should not fail - set if key does not exist already', (done) => {
    const payload = {
      data : {name: 'hello world'},
      dbKey : 'user10',
      action : 'store',
      options: {
        setIf : 'not_exist'
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.created, done);
  });

  it('should fail to store - should not set if key exist already', (done) => {
    var payload = {
      data : {name: 'hello world'},
      dbKey : 'user3',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      });
    payload.options = {setIf: 'not_exist'};

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.bad_request, done);
  });

  it('should increment', (done) => {
    const storePayload = {
      data : {
        random: 1
      },
      dbKey : 'sampleKey',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const updatePayload = {
      dbKey: 'sampleKey',
      action: 'update',
      type: 'increment',
      attributes: {
        random: 2
      }
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.ok, done);
      });
  });

  it('should append', (done) => {
    const storePayload = {
      data : {
        random: [1]
      },
      dbKey : 'sampleKey1',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const updatePayload = {
      dbKey: 'sampleKey1',
      action: 'update',
      type: 'append',
      attributes: {
        random: [2]
      }
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.ok, done);
      });
  });

  it('should fail to increment', (done) => {
    const storePayload = {
      data : {
        random: 1
      },
      dbKey : 'sampleKey2',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const updatePayload = {
      dbKey: 'sampleKey2',
      action: 'update',
      type: 'increment',
      attributes: {
        random: 'abc'
      }
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.bad_request, done);
      });
  });

  it('should fail to append', (done) => {
    const storePayload = {
      data : {
        random: [1]
      },
      dbKey : 'sampleKey3',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const updatePayload = {
      dbKey: 'sampleKey3',
      action: 'update',
      type: 'append',
      attributes: {
        random: 2
      }
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.bad_request, done);
      });
  });

  it('should create when key is not present', (done) => {
    const updatePayload = {
      dbKey: 'sampleKey4',
      action: 'update',
      type: 'increment',
      attributes: {
        random: 2
      }
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };

    request(server)
      .post('/dprouter')
      .send(updatePayload)
      .set(headers)
      .expect(httpUtil.status.ok, done);
  });

  it('should increment when attributeis not present', (done) => {
    const storePayload = {
      data : {
        note: 'abc'
      },
      dbKey : 'sampleKey5',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const updatePayload = {
      dbKey: 'sampleKey5',
      action: 'update',
      type: 'increment',
      attributes: {
        random: 2
      }
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.ok, done);
      });
  });

  it('should fail when action is incorrect', (done) => {
    const storePayload = {
      data : {
        random: [1]
      },
      dbKey : 'sampleKey6',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const updatePayload = {
      dbKey: 'sampleKey6',
      action: 'update',
      type: 'random',
      attributes: {
        random: 2
      }
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.bad_request, done);
      });
  });

  it('should fail when key is blank', (done) => {
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const updatePayload = {
      dbKey: '',
      action: 'update',
      type: 'increment',
      attributes: {
        random: 2
      }
    };

    request(server)
      .post('/dprouter')
      .send(updatePayload)
      .set(headers)
      .expect(httpUtil.status.bad_request, done);
  });

  it('should fail when attribute value is not a number to increment', (done) => {
    const storePayload = {
      data : {
        note: 1
      },
      dbKey : 'sampleKey7',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const updatePayload = {
      dbKey: 'sampleKey7',
      action: 'update',
      type: 'increment',
      attributes: {
        random: 'abc'
      }
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.bad_request, done);
      });
  });

  it('should fail when value to increment is not a number', (done) => {
    const storePayload = {
      data : {
        note: 'abc'
      },
      dbKey : 'sampleKey8',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const updatePayload = {
      dbKey: 'sampleKey8',
      action: 'update',
      type: 'increment',
      attributes: {
        note: 1
      }
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.bad_request, done);
      });
  });

  it('should update on set action with proper attributes', function(done) {
    const storePayload = {
      data : {
        note: 'abc',
        attr: {
          info: 1
        }
      },
      dbKey : 'testSet',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const updatePayload = {
      dbKey: 'testSet',
      action: 'update',
      type: 'set',
      attributes: {
        'note': 1,
        'attr.info': 2
      }
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.ok, done);
      });
  });

  it('should should throw error on update with set action if attributes size exceeds max limit', function(done) {
    const storePayload = {
      data : {
        note: 'abc',
        attr: {
          info: 1
        }
      },
      dbKey : 'testSet',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };
    const minArraySize = 10000;

    const updatePayload = {
      dbKey: 'testSet',
      action: 'update',
      type: 'set',
      attributes: {
        'note': new Array(minArraySize).fill('1').join(''),
        'attr.info': 2
      }
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.bad_request, done);
      });
  });

  it('should succeed given proper attributes for update remove', function(done) {
    const storePayload = {
      data : {
        note: 'abc',
        attr: {
          info: 1,
          rating: [1, 2]
        }
      },
      dbKey : 'testRemove',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };

    const updatePayload = {
      dbKey: 'testRemove',
      action: 'update',
      type: 'remove',
      attributes: ['attr.info', 'attr.rating[1]']
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.ok, done);
      });
  });

  it('should fail if attributes is not array for remove', function(done) {
    const storePayload = {
      data : {
        note: 'abc',
        attr: {
          info: 1,
          rating: [1, 2]
        }
      },
      dbKey : 'testRemove',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };

    const updatePayload = {
      dbKey: 'testRemove',
      action: 'update',
      type: 'remove',
      attributes: {'attr.info': 1}
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.bad_request, done);
      });
  });

  it('should fail if key is blank in attributes for update remove', function(done) {
    const storePayload = {
      data : {
        note: 'abc',
        attr: {
          info: 1,
          rating: [1, 2]
        }
      },
      dbKey : 'testRemove',
      action : 'store'
    };
    const headers = {
      'content-type':'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'db'
    };

    const updatePayload = {
      dbKey: 'testRemove',
      action: 'update',
      type: 'remove',
      attributes: ['', 'attr']
    };

    request(server)
      .post('/dprouter')
      .send(storePayload)
      .set(headers)
      .expect(httpUtil.status.created)
      .then(() => {
        request(server)
          .post('/dprouter')
          .send(updatePayload)
          .set(headers)
          .expect(httpUtil.status.unprocessable_entity, done);
      });
  });

  it('backend - should store (string)', (done) => {
    db.set('user1', {'info': 'hello world'})
      .then((data) => {
        expect(data).eql({Created:true});
        done();
      });
  });

  it('backend - should store (number)', (done) => {
    db.set('number', {'info': 1234})
      .then((data) => {
        expect(data).eql({Created:true});
        done();
      });
  });

  it('backend - should store (boolean)', (done) => {
    db.set('boolean', {'info': true})
      .then((data) => {
        expect(data).eql({Created:true});
        done();
      });
  });

  it('backend - should fetch (string)', (done) => {
    db.get('user1')
      .then((data) => {
        expect(data).eql({info: 'hello world'});
        done();
      });
  });

  it('backend - should fetch (number)', (done) => {
    db.get('number')
      .then((data) => {
        expect(data).eql({info: 1234});
        done();
      });
  });

  it('backend - should fetch (boolea )', (done) => {
    db.get('boolean')
      .then((data) => {
        expect(data).eql({info: true});
        done();
      });
  });

  it('should fail store - 201', (done) => {
    const payload = {
      data : {
        one: {
          '': 'asas'
        }
      },
      dbKey : 'user1',
      action : 'store'
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'content-type':'application/json',
        'MKP-EXTNID': '101',
        'MKP-VERSIONID': '101',
        'MKP-ROUTE': 'db'
      })
      .expect(httpUtil.status.bad_request, done);
  });

  it('backend - should delete', (done) => {
    db.delete('user1')
      .then((data) => {
        expect(data).eql({Deleted: true});
        done();
      });
  });

  it('backend - should fail storing - missing attributes', (done) => {
    db.set('user1')
      .then(() => { })
      .fail((err) => {
        expect(err).eql({
          message: 'Mandatory attributes (key or value) is missing',
          status: httpUtil.status.bad_request
        });
        done();
      });
  });

  it('backend - should replace empty strings and NaN with null', (done) => {
    db.set('user1', {
      hello: '',
      world: ['asas', ''],
      fai: {
        foo: NaN
      }
    })
      .then(() => {
        db.get('user1')
          .then((data) => {
            expect(data).to.deep.equal({
              hello: null,
              world: ['asas', null],
              fai: {
                foo: null
              }
            });
            done();
          })
          .fail(done);
      })
      .fail(done);
  });

  it('backend - should fail storing - missing attributes', (done) => {
    db.set(undefined, {one: 'true'})
      .then(() => { })
      .fail((err) => {
        expect(err).eql({
          message: 'Mandatory attributes (key or value) is missing',
          status: httpUtil.status.bad_request
        });
        done();
      });
  });

  it('backend - should fail storing - data must be json', (done) => {
    const randomNumber = 34;

    db.set('user1', randomNumber)
      .then(() => {
      })
      .fail((err) => {
        expect(err).eql({
          message: 'The value cannot be blank and should be of type JSON',
          status: httpUtil.status.unprocessable_entity
        });
        done();
      });
  });
});
