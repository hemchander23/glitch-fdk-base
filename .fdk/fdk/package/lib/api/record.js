'use strict';

const debuglog = __debug.bind(null, __filename);

const {
  getRecord,
  getRecords,
  createRecord,
  updateRecord,
  deleteRecord
} = require('../actions/record');

const httpUtil = require('../utils/http-util');
const { getNextLink } = require('../utils/custom-objects');
const DEFAULT_PAGE_LIMIT = 100;

/**
 * Controller to fetch a record
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
async function fetch(req, res) {
  debuglog(`received a fetch record request ${JSON.stringify(req.body)}`);

  const {
    record,
    entity
  } = req.body.data;

  const pagination = {
    limit: parseInt(req.query.page_size) || DEFAULT_PAGE_LIMIT
  };

  if (!record || !record.id || record.query || record.next) {
    const records = await getRecords(entity, record, pagination);
    let href = null;

    if (records.length > pagination.limit) {
      debuglog('setting up next link');
      const lastRecord = records.pop();

      href = getNextLink(req, lastRecord, pagination.limit);
      debuglog(`href obtained ${href}`);
    }

    return res.send({
      records,
      links: { next: href }
    });
  }

  const response = await getRecord(entity, record);

  return res.send({ record: response });
}

/**
 * Controller to create a record
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
async function create(req, res) {
  debuglog('received a create record request');

  const data = req.body.data || {};

  const record = await createRecord(data.entity, data.record);

  return res.status(httpUtil.status.created).send({ record });
}

/**
 * Controller to update a record
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
async function update(req, res) {
  debuglog('received a update record request');

  const {
    data: {
      entity,
      record
    }
  } = req.body;

  const updatedRecord = await updateRecord(entity, record);

  return res.send({ record: updatedRecord });
}

/**
 * Controller to delete a record
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
async function del(req, res) {
  debuglog('received a del record request');

  const {
    data: {
      entity,
      record
    }
  } = req.body;

  await deleteRecord(entity, record);

  return res.status(httpUtil.status.no_content).send();
}

module.exports = {
  fetch,
  create,
  update,
  delete: del
};
