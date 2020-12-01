'use strict';

const _ = require('lodash');
const jQueryDeferred = require('jquery-deferred');
const moment = require('moment-timezone');
const request = require('request');

const DataStore = require('../../utils/data-util').DataStore;
const helper = require('../../utils/helper-util');
const httpUtil = require('../../utils/http-util');
const nsUtil = require('../../utils/file-util').nsresolver;

const MANDATORY_READ_OR_DELETE_FIELDS = ['name'];
const MANDATORY_WRITE_FIELDS = ['name', 'data', 'schedule_at'];
const MANDATORY_RECURRING_FIELDS = ['time_unit', 'frequency', 'timezone'];
const ALLOWED_TIME_UNITS = ['minutes', 'hours', 'days'];
const SCHEDULED_EVENT = 'onScheduledEvent';
const SCHEDULED_EVENT_TRIGGER_URL = 'http://localhost:3000/event/execute?name=onScheduledEvent';
const SCHEDULED_WAIT_TIME = 3000;
const MAX_KEY_LENGTH = 30;
const MAX_DATA_SIZE = 4096;
const MIN_SEC = 60;
const HOUR_MIN = 60;
const DAY_HOUR = 24;
const MILLISECOND = 1000;
const MIN_MINUTES_TO_SCHEDULE = 5;
const MINUTES_IN_YEAR = 525600;
const UNIT_TO_FREQUENCY = {
  minutes: 60,
  hours: 24,
  days: 30
};
const SCHEDULE_MAP = new Map();
const TIMEOUT_MAP = new Map();
const isRecurringSet = {};
const SCHEDULE_MESSAGES = {
  'created': 'Schedule created',
  'deleted': 'Schedule deleted',
  'updated': 'Schedule updated',
  'not_found': 'Schedule does not exist',
  'max_recurring': 'The maximum number of recurring schedules is 1',
  'schedule_exists': 'This Schedule name already exists'
};
const DEFAULT_TIMEZONE = 'UTC';

const storage = new DataStore({});
const scheduleArgs = Symbol();

function timeDifferenceInMinutes(startTime, endTime) {
  return moment.duration(moment(endTime).diff(moment(startTime))).asMinutes();
}

const DEFAULT_VALIDATION = [
  function findMissingKeys(meta) {
    const missingKeys = _.difference(MANDATORY_READ_OR_DELETE_FIELDS, _.keys(meta.userInput));

    if (missingKeys.length > 0) {
      return `The following mandatory keys are missing - ${missingKeys.join(',')}`;
    }
  },

  function validateKeyType(meta) {
    if (typeof meta.userInput.name !== 'string') {
      return 'Name must be of type string';
    }
  }
];

const CREATE_OR_UPDATE_VALIDATION = [
  function findMissingKeys(meta) {
    let missingKeys = _.difference(MANDATORY_WRITE_FIELDS, _.keys(meta.userInput));

    if (meta.userInput.repeat) {
      missingKeys = _.union(missingKeys, _.difference(MANDATORY_RECURRING_FIELDS,
        Object.keys(meta.userInput.repeat)));
    }
    if (missingKeys.length > 0) {
      return `The following mandatory keys are missing - ${missingKeys.join(',')}`;
    }
  },

  function validateKeyType(meta) {
    if (typeof meta.userInput.name !== 'string') {
      return 'Name must be of type string';
    }
  },

  function validateIdLength(meta) {
    if (meta.userInput.name.length > MAX_KEY_LENGTH) {
      return 'Name length must not be greater than 30';
    }
  },

  function validateDataType(meta) {
    if (typeof meta.userInput.data !== 'object') {
      return 'The \'data\' value must be of type JSON';
    }
  },

  function validateDataSize(meta) {
    if (helper.objsize(meta.userInput.data) > MAX_DATA_SIZE) {
      return 'The size of the \'data\' payload must not exceed 4Kb';
    }
  },

  function validateTimeFormat(meta) {
    if (!moment(meta.userInput.schedule_at, moment.ISO_8601).isValid()) {
      return 'The \'schedule_at\' value must be an ISO string';
    }
  },

  function validateScheduleTimeLength(meta) {
    if (!meta.userInput.repeat){
      if (timeDifferenceInMinutes(new Date().toISOString(), meta.userInput.schedule_at)
        < MIN_MINUTES_TO_SCHEDULE) {
        return 'The \'schedule_at\' value must be at least 5 minutes in the future';
      }
      if (timeDifferenceInMinutes(new Date().toISOString(), meta.userInput.schedule_at)
        > MINUTES_IN_YEAR){
        return 'The \'schedule_at\' value must not be greater than a year';
      }
    }
  },

  function validateScheduleCallback(meta) {
    if (!_.includes(_.map(meta.scheduleArgs.req.meta.events || meta.scheduleArgs.svrExecScript.events || [], 'event'), SCHEDULED_EVENT)) {
      return 'The app has not registered an onScheduledEvent';
    }
  }
];

const RECURRING_VALIDATION = [
  function validateTimeUnit(meta) {
    if (!_.includes(ALLOWED_TIME_UNITS, meta.userInput.repeat.time_unit)) {
      return 'Time unit must either be days, minutes or hours';
    }
  },

  function validateTimeZone(meta) {
    if (!moment.tz.zone(meta.userInput.repeat.timezone)) {
      return 'Invalid timezone';
    }
  },

  function validateFrequencyType(meta) {
    if (typeof meta.userInput.repeat.frequency !== 'number') {
      return 'The \'frequency\' value must be of type Number';
    }
  },

  function validateMinimumFrequency(meta) {
    if (meta.userInput.repeat.frequency <= 0) {
      return 'The \'frequency\' value must be greater than 0';
    }
  },

  function validateFrequency(meta) {
    if (meta.userInput.repeat.frequency > UNIT_TO_FREQUENCY[meta.userInput.repeat.time_unit]) {
      return `The maximum frequency value for the '${meta.userInput.repeat.time_unit}' parameter is ${UNIT_TO_FREQUENCY[meta.userInput.repeat.time_unit]}`;
    }
  }
];

function executeValidation(validations, meta) {
  for (const validation of validations) {
    const err = validation(meta);

    if (err) {
      return err;
    }
  }
  return false;
}

function defaultValidation(meta) {
  return executeValidation(DEFAULT_VALIDATION, meta);
}

function writeValidation(meta) {
  let validations = CREATE_OR_UPDATE_VALIDATION;

  if (meta.userInput.repeat) {
    validations = _.union(validations, RECURRING_VALIDATION);
  }
  return executeValidation(validations, meta);
}

function validateInput(action, meta) {
  switch (action) {
    case 'fetch':
      return defaultValidation(meta);

    case 'create':
      return writeValidation(meta);

    case 'update':
      return writeValidation(meta);

    case 'delete':
      return defaultValidation(meta);
  }
}

function storeScheduleDetails(userInput, scheduleArgs) {
  storage.store(nsUtil.getInternalNamespace('schedule', { userInput, scheduleArgs }), userInput);
}

function fetchScheduleDetails(userInput, scheduleArgs) {
  return storage.fetch(nsUtil.getInternalNamespace('schedule', { userInput, scheduleArgs }));
}

function deleteScheduleDetails(userInput, scheduleArgs) {
  const key = `${userInput.name}_${scheduleArgs.product}`;

  storage.delete(nsUtil.getInternalNamespace('schedule', { userInput, scheduleArgs }));
  clearInterval(SCHEDULE_MAP.get(key));
  SCHEDULE_MAP.delete(key);
  clearTimeout(TIMEOUT_MAP.get(key));
  TIMEOUT_MAP.delete(key);
}

class Scheduler {

  constructor(scheduleArgs) {
    this.scheduleArgs = scheduleArgs;
    // eslint-disable-next-line new-cap
    this.scheduleDefer = jQueryDeferred.Deferred();
  }

  evaluateScheduleTime(scheduleAtUT, repeatData) {
    let repeatTime = null;
    let waitTime = null;

    try {
      waitTime = Date.parse(scheduleAtUT) - Date.now();
      if (waitTime < 0) {
        waitTime = SCHEDULED_WAIT_TIME;
      }
    } catch (err) {
      waitTime = SCHEDULED_WAIT_TIME;
    }
    if (repeatData) {
      switch (repeatData.time_unit) {
        case 'minutes': {
          repeatTime = repeatData.frequency * MIN_SEC * MILLISECOND;
          break;
        }
        case 'hours': {
          repeatTime = repeatData.frequency * HOUR_MIN * MIN_SEC * MILLISECOND;
          break;
        }
        case 'days': {
          repeatTime = repeatData.frequency * DAY_HOUR * HOUR_MIN * MIN_SEC * MILLISECOND;
          break;
        }
        default: {
          repeatTime = repeatData.frequency * MILLISECOND;
          break;
        }
      }
    }

    return {
      repeatTime: repeatTime || null,
      waitTime: waitTime
    };
  }

  executeSchedule(userInput, interval, scheduleArgs) {
    if (!interval) {
      request({
        method: 'POST',
        url: `${SCHEDULED_EVENT_TRIGGER_URL}&product=${scheduleArgs.product}`,
        json: userInput.data
      });
      this.deleteSchedule(userInput);
      return null;
    }
    return setInterval(() => {
      request({
        method: 'POST',
        url: `${SCHEDULED_EVENT_TRIGGER_URL}&product=${scheduleArgs.product}`,
        json: userInput.data
      });
    }, interval);
  }

  createSchedule(userInput) {
    const scheduleDetails = fetchScheduleDetails(userInput, this.scheduleArgs);

    if (!scheduleDetails){
      const repeatData = this.evaluateScheduleTime(userInput.schedule_at, userInput.repeat);
      const key = `${userInput.name}_${this.scheduleArgs.product}`;

      if (isRecurringSet[this.scheduleArgs.product] && repeatData.repeatTime) {
        this.scheduleDefer.reject({
          status: httpUtil.bad_request,
          message: SCHEDULE_MESSAGES.max_recurring
        });
      }
      else {
        storeScheduleDetails(userInput, this.scheduleArgs);
        if (repeatData.repeatTime){
          isRecurringSet[this.scheduleArgs.product] = true;
        }
        const timeoutId = setTimeout(() => {
          const scheduleId = this.executeSchedule(userInput, repeatData.repeatTime,
            this.scheduleArgs);

          if (scheduleId) {
            SCHEDULE_MAP.set(key, scheduleId);
          }
        }, repeatData.waitTime);

        TIMEOUT_MAP.set(key, timeoutId);
        this.scheduleDefer.resolve({
          status: httpUtil.status.ok,
          message: SCHEDULE_MESSAGES.created
        });
      }
    }
    else {
      this.scheduleDefer.reject({
        status: httpUtil.status.bad_request,
        message: SCHEDULE_MESSAGES.schedule_exists
      });
    }

  }

  fetchSchedule(userInput) {
    const scheduleDetails = fetchScheduleDetails(userInput, this.scheduleArgs);

    if (scheduleDetails) {
      this.scheduleDefer.resolve(scheduleDetails);
    }
    else {
      this.scheduleDefer.reject({
        status: httpUtil.status.not_found,
        message: SCHEDULE_MESSAGES.not_found
      });
    }
  }

  updateSchedule(userInput) {
    const scheduleDetails = fetchScheduleDetails(userInput, this.scheduleArgs);
    const repeatData = this.evaluateScheduleTime(userInput.schedule_at, userInput.repeat);

    if (scheduleDetails) {
      const key = `${userInput.name}_${this.scheduleArgs.product}`;

      deleteScheduleDetails(userInput, this.scheduleArgs);
      storeScheduleDetails(userInput, this.scheduleArgs);
      const timeoutId = setTimeout(() => {
        const scheduleId = this.executeSchedule(userInput, repeatData.repeatTime,
          this.scheduleArgs);

        if (scheduleId) {
          SCHEDULE_MAP.set(key, scheduleId);
        }
      }, repeatData.waitTime);

      TIMEOUT_MAP.set(key, timeoutId);
      this.scheduleDefer.resolve({
        status: httpUtil.status.ok,
        message: SCHEDULE_MESSAGES.updated
      });
    }
    else {
      this.scheduleDefer.reject({
        status: httpUtil.status.not_found,
        message: SCHEDULE_MESSAGES.not_found
      });
    }
  }

  deleteSchedule(userInput) {
    const scheduleDetails = fetchScheduleDetails(userInput, this.scheduleArgs);

    if (scheduleDetails) {
      if (scheduleDetails.repeat){
        isRecurringSet[this.scheduleArgs.product] = false;
      }
      deleteScheduleDetails(userInput, this.scheduleArgs);
      this.scheduleDefer.resolve({
        status: httpUtil.status.ok,
        message: SCHEDULE_MESSAGES.deleted
      });
    }
    else {
      this.scheduleDefer.reject({
        status: httpUtil.status.not_found,
        message: SCHEDULE_MESSAGES.not_found
      });
    }
  }

  makeCall(action, userInput) {
    switch (action) {
      case 'create':
        this.createSchedule(userInput);
        break;

      case 'fetch':
        this.fetchSchedule(userInput);
        break;

      case 'update':
        this.updateSchedule(userInput);
        break;

      case 'delete':
        this.deleteSchedule(userInput);
        break;
    }
  }

  performAction(action, userInput) {

    // Taking default timezone for now
    if (userInput.repeat) {
      userInput.repeat.timezone = userInput.repeat.timezone || DEFAULT_TIMEZONE;
    }

    var validationError = validateInput(action, {
      userInput: userInput,
      scheduleArgs: this.scheduleArgs
    });

    if (validationError) {
      return this.scheduleDefer.reject({
        status: httpUtil.status.bad_request,
        message: validationError
      });
    }

    this.makeCall(action, userInput);
    return this.scheduleDefer.promise();
  }
}

class ScheduleApi {
  constructor(args) {
    this[scheduleArgs] = args;
  }

  fetch(data) {
    return new Scheduler(this[scheduleArgs]).performAction('fetch', data);
  }

  create(data) {
    return new Scheduler(this[scheduleArgs]).performAction('create', data);
  }

  update(data) {
    return new Scheduler(this[scheduleArgs]).performAction('update', data);
  }

  delete(data) {
    return new Scheduler(this[scheduleArgs]).performAction('delete', data);
  }

}

module.exports = ScheduleApi;
