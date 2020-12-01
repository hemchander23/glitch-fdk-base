const CURRENT_PRODUCT = 'current';

export default {
  methods: {
    getProductAuthentication(product, domainName, apikey, productURL) {
      const productAuth = {
        freshdesk: {
          url: `https://${domainName}.${productURL}/api/v2/settings/helpdesk`,
          productURL: `https://${domainName}.${productURL}`,
          headers: {
            Authorization: `Basic ${btoa(apikey)}`
          }
        },
        freshservice: {
          url: `https://${domainName}.${productURL}/api/v2/agents`,
          productURL: `https://${domainName}.${productURL}`,
          headers: {
            Authorization: `Basic ${btoa(apikey)}`
          }
        },
        freshsales: {
          url: `https://${domainName}.${productURL}/api/settings/sales_accounts/fields`,
          productURL: `https://${domainName}.${productURL}`,
          headers: {
            Authorization: `Token token=${apikey}`
          }
        },
        freshchat: {
          url: 'https://api.freshchat.com/v2/agents',
          productURL: 'https://api.freshchat.com',
          headers: {
            Authorization: `Bearer ${apikey}`
          }
        },
        freshcaller: {
          url: `https://${domainName}.${productURL}/api/v1/users`,
          productURL: `https://${domainName}.${productURL}`,
          headers: {
            accept: 'application/json',
            'X-Api-Auth': `${apikey}`
          }
        },
        freshteam: {
          url: `https://${domainName}.${productURL}/api/branches`,
          productURL: `https://${domainName}.${productURL}`,
          headers: {
            Authorization: `Bearer ${apikey}`
          }
        },
        freshworks_crm: {
          url: `https://${domainName}.${productURL}/crm/sales/api/contacts/filters`,
          productURL: `https://${domainName}.${productURL}/crm`,
          headers: {
            Authorization: `Token token=${apikey}`
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
            productName: api.productName !== CURRENT_PRODUCT ?
              api.productName : this.client.context.product
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
          this.model[api.model], domain.productURL);
        const options = {
          headers: product.headers
        };
        const promise = this.callRequestApi(product.url, options);

        promise.then((result) => {
          const status = result ? '' : 'Invalid field';
          const userErrorMessage = result ? '' : 'Domain or API key is not matching';

          if (result && domain.model) {
            // generate the $fieldName object and attach it to modal.
            this.model[`$${domain.model}`] = {
              url: product.productURL,
              name: obj.productName
            };
          }

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
