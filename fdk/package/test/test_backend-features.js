'use strict';

/* eslint-disable max-nested-callbacks */

const expect = require('chai').expect;
const fs = require('fs-extra');
const tmp = require('tmp');

const httpUtil = require('../lib/utils/http-util');
const stub = require('./stub');

const yearOffset = 5;
const futureTime = new Date(new Date().getFullYear() + yearOffset, 1, 1);

describe('Backend $request test', () => {

  let projDir, $request, server;

  before(() => {
    nukeCache();
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    process.chdir(projDir.name);
    const RequestAPI = require('../lib/event_handler/features/request');

    $request = new RequestAPI();

    require(__dirname + '/../lib/manifest').reload();
    server = require('../lib/cli/run').run();
  });

  after(() => {
    server.close();
  });

  it('OAuth refresh', (done) => {
    $request.get('https://httpbin.org/status/401', {
      isOAuth: true
    }).then(() => {
      done();
    }, (err) => {
      expect(err.status).to.eql(httpUtil.status.unauthorized);
      done();
    });
  });

  it('Unsupported content type', (done) => {
    $request.get('https://httpbin.org/image/png', {}).then(() => {
      done();
    }, (err) => {
      expect(err).to.eql({ status: httpUtil.status.unsupported_media,
        headers: {},
        errorSource: 'APP',
        response: 'Unsupported content type' });
      done();
    });
  });

  it('make request', (done) => {
    $request.post('https://httpbin.org/post', {
      headers: {
        auth: '<%= encode(\'hello\') %>'
      }
    })
      .then((data) => {
        expect(JSON.parse(data.response).headers.Auth).to.eql('aGVsbG8=');
        expect(data.status).to.eql(httpUtil.status.ok);
        done();
      }, () => {
        done();
      });
  });

  it('err code > 400', (done) => {
    $request.get('https://httpbin.org/status/404', {})
      .then(null, (err) => {
        expect(err.errorSource).to.eql('APP');
        done();
      });
  });

  it('contains all method', (done) => {
    expect(Object.keys($request)).to.eql([ 'get', 'post', 'put', 'patch', 'delete' ]);
    done();
  });

});

describe('Schedule event test', () => {
  let $schedule, projDir;

  before(() => {
    nukeCache();

    /*
      Stubbing request to prevent making request to invoke scheduled events
    */
    stub.stubModule('request', () => {});
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});

    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    process.chdir(projDir.name);

    const testServerFile = __dirname + '/../test-res/backend_server.js';
    const serverFile = projDir.name + '/server/server.js';

    require(__dirname + '/../lib/manifest').reload();
    fs.copySync(testServerFile, serverFile);

    fs.writeFileSync(projDir.name + '/.report.json', JSON.stringify({}));

    const ScheduleAPI = require('../lib/event_handler/features/schedule');

    $schedule = new ScheduleAPI({
      svrExecScript: {
        events: [
          {event: 'onScheduledEvent', callback: 'onScheduledEvent'}
        ]
      }
    });
  });

  after(() => {
    stub.releaseStub('request');
  });

  it('Error out - Mandatory Keys missing', (done) => {
    $schedule.create({
      name: '1234'
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('The following mandatory keys are missing - data,schedule_at');
        done();
      });
  });

  it('Error out - Invalid data type', (done) => {
    $schedule.create({
      name: '1234',
      data: 'hello',
      schedule_at: futureTime
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('The \'data\' value must be of type JSON');
        done();
      });
  });

  it('Error out - Invalid name type', (done) => {
    $schedule.create({
      name: undefined,
      data: {},
      schedule_at: futureTime
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('Name must be of type string');
        done();
      });
  });

  it('Error out - Length of name exceeded', (done) => {
    const LENGTH_TO_EXCEED = 35;

    $schedule.create({
      name: Array(LENGTH_TO_EXCEED).join('a'),
      data: {},
      schedule_at: futureTime
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('Name length must not be greater than 30');
        done();
      });
  });

  it('Error out - Length of data exceeded', (done) => {
    const LENGTH_TO_EXCEED = 999999;

    $schedule.create({
      name: '1234',
      data: {hello: Array(LENGTH_TO_EXCEED).join('a')},
      schedule_at: futureTime
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('The size of the \'data\' payload must not exceed 4Kb');
        done();
      });
  });

  it('Error out - Invalid start time (not in ISO)', (done) => {
    $schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: '2019-xy-ty'
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('The \'schedule_at\' value must be an ISO string');
        done();
      });
  });

  it('Error out - Missing keys in repeat section', (done) => {
    $schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: futureTime,
      repeat: {

      }
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('The following mandatory keys are missing - time_unit,frequency');
        done();
      });
  });

  it('Error out - Wrong repeat time unit', (done) => {
    $schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: futureTime,
      repeat: {
        time_unit: 'decade',
        frequency: 1,
        timezone: 'Asia/Kolkata'
      }
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('Time unit must either be days, minutes or hours');
        done();
      });
  });

  it('Error out - Invalid repeat frequency', (done) => {
    $schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: futureTime,
      repeat: {
        time_unit: 'minutes',
        frequency: 1000,
        timezone: 'Asia/Kolkata'
      }
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('The maximum frequency value for the \'minutes\' parameter is 60');
        done();
      });
  });

  it('Error out - Invalid timezone', (done) => {
    $schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: futureTime,
      repeat: {
        time_unit: 'minutes',
        frequency: 30,
        timezone: 'Mars Timezone'
      }
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('Invalid timezone');
        done();
      });
  });

  it('Error out - Name must be string', (done) => {
    $schedule.fetch({
      name: undefined
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('Name must be of type string');
        done();
      });
  });

  it('Error out - Mandatory Keys missing', (done) => {
    $schedule.fetch({

    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('The following mandatory keys are missing - name');
        done();
      });
  });

  it('Error out - Schedule time must be 5 minutes in future', (done) => {
    $schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: '2000-02-20T17:38:38.626Z'
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('The \'schedule_at\' value must be at least 5 minutes in the future');
        done();
      });
  });

  it('Error out - Without a callback being registered', (done) => {
    const ScheduleAPI = require('../lib/event_handler/features/schedule');
    const schedule = new ScheduleAPI({
      svrExecScript: {
        events: []
      }
    });

    schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: '2020-02-20T17:38:38.626Z'
    })
      .then(null, (err) => {
        expect(err.status).to.eql(httpUtil.status.bad_request);
        expect(err.message).to.eql('The app has not registered an onScheduledEvent');
        done();
      });
  });

  it('Create one time schedule', (done) => {
    $schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: futureTime
    })
      .then((success) => {
        expect(success.status).to.eql(httpUtil.status.ok);
        done();
      });
  });

  it('Create recurring schedule', (done) => {
    $schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: futureTime,
      repeat: {
        time_unit: 'hours',
        frequency: 3,
        timezone: 'Asia/Kolkata'
      }
    })
      .then((success) => {
        expect(success.status).to.eql(httpUtil.status.ok);
        done();
      });
  });

  it('Error out - Create recurring schedule - Invalid frequency', (done) => {
    $schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: futureTime,
      repeat: {
        time_unit: 'hours',
        frequency: undefined,
        timezone: 'Asia/Kolkata'
      }
    })
      .then(null, (err) => {
        expect(err).to.eql({
          message: 'The \'frequency\' value must be of type Number',
          status: httpUtil.status.bad_request
        });
        done();
      });
  });

  it('Error out - Create recurring schedule - Frequency must be > 0', (done) => {
    $schedule.create({
      name: '1234',
      data: {'hello': 'world'},
      schedule_at: futureTime,
      repeat: {
        time_unit: 'hours',
        frequency: -10,
        timezone: 'Asia/Kolkata'
      }
    })
      .then(null, (err) => {
        expect(err).to.eql({
          message: 'The \'frequency\' value must be greater than 0',
          status: httpUtil.status.bad_request
        });
        done();
      });
  });

  it('Fetch schedule', (done) => {

    function fetchSchedule() {
      $schedule.fetch({
        name: '123456'
      })
        .then((data) => {
          expect(data.name).to.eql('123456');
          done();
        });
    }

    $schedule.create({
      name: '123456',
      data: {'hello': 'world'},
      schedule_at: futureTime
    })
      .then(() => {
        fetchSchedule();
      });
  });

  it('Fetch schedule (Not found)', (done) => {
    $schedule.fetch({
      name: 'aaaaa'
    })
      .then(null, (err) => {
        expect(err).to.eql({
          message: 'Schedule does not exist',
          status: httpUtil.status.not_found
        });
        done();
      });
  });

  it('Update schedule', (done) => {

    function updateSchedule() {
      $schedule.update({
        name: '123456',
        data: {'hello': 'world'},
        schedule_at: futureTime
      })
        .then((data) => {
          expect(data).to.eql({
            status: httpUtil.status.ok,
            message: 'Schedule updated'
          });
          done();
        });
    }

    $schedule.create({
      name: '123456',
      data: {'hello': 'world'},
      schedule_at: futureTime
    })
      .then(() => {
        updateSchedule();
      });
  });

  it('Update schedule (Not found)', (done) => {
    $schedule.update({
      name: 'aaaaaaaaa',
      data: {'hello': 'world'},
      schedule_at: futureTime
    })
      .then(null, (err) => {
        expect(err).to.eql({
          message: 'Schedule does not exist',
          status: httpUtil.status.not_found
        });
        done();
      });
  });

  it('Delete schedule', (done) => {

    function deleteSchedule() {
      $schedule.delete({
        name: '12345678'
      })
        .then((data) => {
          expect(data.status).to.eql(httpUtil.status.ok);
          done();
        });
    }

    $schedule.create({
      name: '12345678',
      data: {'hello': 'world'},
      schedule_at: futureTime
    })
      .then(() => {
        deleteSchedule();
      });
  });

  it('Delete schedule (Not found)', (done) => {
    $schedule.delete({
      name: 'aaaaa'
    })
      .then(null, (err) => {
        expect(err).to.eql({
          message: 'Schedule does not exist',
          status: httpUtil.status.not_found
        });
        done();
      });
  });
});
