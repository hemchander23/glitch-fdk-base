export default {
  methods: {
    getProductAuthentication(product, domainName, apikey) {
      const productAuth = {
        freshdesk: {
          url: `https://${domainName}.freshdesk.com/api/v2/settings/helpdesk`,
          headers: {
            Authorization: `Basic ${btoa(apikey)}`
          }
        },
        freshservice: {
          url: `https://${domainName}.freshservice.com/api/v2/agents`,
          headers: {
            Authorization: `Basic ${btoa(apikey)}`
          }
        },
        freshsales: {
          url: `https://${domainName}.freshsales.io/api/settings/sales_accounts/fields`,
          headers: {
            Authorization: `Token token=${apikey}`
          }
        },
        freshchat: {
          url: 'https://api.freshchat.com/v2/agents',
          headers: {
            Authorization: `Bearer ${apikey}`
          }
        }
      };

      return productAuth[product];
    },

    callRequestApi(url, options) {
      return new Promise((resolve) => {
        this.client.request.get(url, options).then(data => {
          if (data.status === this.SUCCESS) {
            resolve(true);
          } else {
            resolve(false);
          }
        }).catch(() => {
          resolve(false);
        });
      });
    },

    getUniqueListBy(arr, key) {
      return [...new Map(arr.map(item => [item[key], item])).values()];
    },

    mapDomainAPI() {
      const apikey = this.schema.fields.filter((field) => field.dataType === 'api_key' && field.productName);
      const domain = this.schema.fields.filter((field) => field.dataType === 'domain' && field.productName);

      if (domain.length === 0 && apikey.length > 0) {
        // domain is not present for freshchat so add empty domain to map
        domain.push('');
      }

      const result = domain.reduce((total, domainNode) => {
        const mapping = apikey.filter(apiKeyNode => {
          return this.model[apiKeyNode.model] !== '' && this.model[domainNode.model] !== '' &&
            apiKeyNode.productName === domainNode.productName || apiKeyNode.productName === 'freshchat';
        }).map(api => {
          return {
            domain: api.productName !== 'freshchat' ? domainNode : null,
            api: api,
            productName: api.productName
          };
        });

        return total.concat(mapping);
      }, []);

      return this.getUniqueListBy(result, 'productName');
    },

    setCustomValidity(element, value) {
      if (element) {
        element.setCustomValidity(value);
      }
    },

    validateDomainAPI() {
      const domainAPI = this.mapDomainAPI();
      const promises = domainAPI.map((obj) => {
        const domain = obj.domain || {};
        const api = obj.api;
        const product = this.getProductAuthentication(obj.productName, this.model[domain.model],
          this.model[api.model]);
        const options = {
          headers: product.headers
        };
        const promise = this.callRequestApi(product.url, options);

        promise.then((result) => {
          const status = result ? '' : 'Invalid field';
          const userErrorMessage = result ? '' : 'Domain or API key is not matching';

          domain.userErrorMessage = userErrorMessage;
          api.userErrorMessage = userErrorMessage;

          this.setCustomValidity(document.getElementById(domain.id), status);
          this.setCustomValidity(document.getElementById(api.id), status);
        });

        return promise;
      });

      return Promise.all(promises);
    }
  }
};
