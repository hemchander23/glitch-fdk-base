'use strict';

const { getEntity } = require('../actions/entity');

module.exports = {

  /**
   * Controller to fetch the entity
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async fetch(req, res) {
    const entity = await getEntity(req.body.data.entity.name);

    return res.send({ entity });
  }
};
