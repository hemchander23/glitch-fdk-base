import { getConfigs } from './static/get-configs';
import { postConfigs } from './static/post-configs';
import { validate } from './static/validation';
import './static/framework.js';
import utils from './static/utils';

window.getConfigs = getConfigs;
window.postConfigs = postConfigs;
window.validate = validate;
window.utils = utils;
