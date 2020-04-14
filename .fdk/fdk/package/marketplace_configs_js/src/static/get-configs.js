function updateConfigs(configs) {
  return window.viewModel.getConfigs(configs);
}

// Update config has to be refered to as "getConfigs", because
// of historical reasons
const getConfigs = updateConfigs;

module.exports = {
  getConfigs
};
