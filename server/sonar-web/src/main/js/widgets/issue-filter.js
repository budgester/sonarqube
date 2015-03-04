define(['templates/widgets'], function () {

  var $ = jQuery,
      defaultComparator = function (item) {
        return -item.count;
      },
      defaultFilter = function (item) {
        var items = this.query[this.property];
        return items == null ||
            (items != null && items.split(',').indexOf(item.val) !== -1);
      },
      defaultLabel = function (item) {
        return item.val;
      },
      defaultLink = function (item, property, query) {
        var criterion = {};
        criterion[property] = item.val;
        var r = _.extend({}, query, criterion);
        if (r.componentKey != null) {
          return baseUrl + '/component_issues/index?id=' + encodeURIComponent(r.componentKey) +
              '#' + getQuery(_.omit(r, 'componentKey'));
        } else {
          return baseUrl + '/issues/search#' + getQuery(r);
        }
      },
      byDistributionConf = {
        'severities': {
          template: 'widget-issue-filter-severities',
          comparator: function (item) {
            var order = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
            return order.indexOf(item.val);
          }
        },
        'statuses': {
          template: 'widget-issue-filter-statuses',
          comparator: function (item) {
            var order = ['OPEN', 'REOPENED', 'CONFIRMED', 'RESOLVED', 'CLOSED'];
            return order.indexOf(item.val);
          }
        },
        'resolutions': {
          template: 'widget-issue-filter-resolutions',
          comparator: function (item) {
            var order = ['', 'FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED'];
            return order.indexOf(item.val);
          },
          filter: function (item) {
            if ('' + this.query.resolved === 'false') {
              return item.val === '';
            } else {
              return defaultFilter.call(this, item);
            }
          }
        },
        'rules': {
          label: function (item, r) {
            if (_.isArray(r.rules)) {
              var rule = _.findWhere(r.rules, { key: item.val });
              if (rule != null) {
                return rule.name;
              }
            }
          }
        },
        'projectUuids': {
          label: function (item, r) {
            if (_.isArray(r.projects)) {
              var project = _.findWhere(r.projects, { uuid: item.val });
              if (project != null) {
                return project.name;
              }
            }
          }
        },
        'assignees': {
          template: 'widget-issue-filter-assignees',
          label: function (item, r) {
            if (_.isArray(r.users)) {
              var user = _.findWhere(r.users, { login: item.val });
              if (user != null) {
                return user.name;
              }
            }
          },
          filter: function (item) {
            if ('' + this.query.assigned === 'false') {
              return item.val === '';
            } else {
              return defaultFilter.call(this, item);
            }
          }
        },
        'languages': {
          label: function (item, r) {
            if (_.isArray(r.languages)) {
              var lang = _.findWhere(r.languages, { key: item.val });
              if (lang != null) {
                return lang.name;
              }
            }
          }
        },
        'actionPlans': {
          template: 'widget-issue-filter-action-plans',
          label: function (item, r) {
            if (_.isArray(r.actionPlans)) {
              var actionPlan = _.findWhere(r.actionPlans, { key: item.val });
              if (actionPlan != null) {
                return actionPlan.name;
              }
            }
          },
          filter: function (item) {
            if ('' + this.query.planned === 'false') {
              return item.val === '';
            } else {
              return defaultFilter.call(this, item);
            }
          }
        },
        'createdAt': {
          comparator: function (item) {
            return moment(item.val).toDate();
          },
          label: function (item, r, items, index, query) {
            var beginning = moment(item.val),
                endDate = query.createdBefore != null ? moment(query.createdBefore) : moment(),
                ending = index < items.length - 1 ? moment(items[index + 1].val).subtract(1, 'days') : endDate,
                isSameDay = ending.diff(beginning, 'days') <= 1;
            return beginning.format('LL') + (isSameDay ? '' : (' – ' + ending.format('LL')));
          },
          link: function (item, property, query, index, items) {
            var createdAfter = moment(item.val),
                endDate = query.createdBefore != null ? moment(query.createdBefore) : moment(),
                createdBefore = index < items.length - 1 ? moment(items[index + 1].val).subtract(1, 'days') : endDate,
                isSameDay = createdBefore.diff(createdAfter, 'days') <= 1;
            if (isSameDay) {
              createdBefore.add(1, 'days');
            }
            var r = _.extend({}, query, {
              createdAfter: createdAfter.format('YYYY-MM-DD'),
              createdBefore: createdBefore.format('YYYY-MM-DD')
            });
            if (r.componentKey != null) {
              return baseUrl + '/component_issues/index?id=' + encodeURIComponent(r.componentKey) +
                  '#' + getQuery(_.omit(r, 'componentKey'));
            } else {
              return baseUrl + '/issues/search#' + getQuery(r);
            }
          }
        }
      };

  function getQuery (query, separator) {
    separator = separator || '|';
    var route = [];
    _.forEach(query, function (value, property) {
      route.push('' + property + '=' + encodeURIComponent(value));
    });
    return route.join(separator);
  }

  Handlebars.registerHelper('issueFilterItemLink', function (query, property, value) {
    var criterion = {};
    criterion[property] = value;
    var r = _.extend({}, query, criterion);
    if (r.componentKey != null) {
      return baseUrl + '/component_issues/index?id=' + encodeURIComponent(r.componentKey) +
          '#' + getQuery(_.omit(r, 'componentKey'));
    } else {
      return baseUrl + '/issues/search#' + getQuery(r);
    }
  });

  Handlebars.registerHelper('issueFilterTotalLink', function (query) {
    var r = _.extend({}, query);
    if (r.componentKey != null) {
      return baseUrl + '/component_issues/index?id=' + encodeURIComponent(r.componentKey) +
          '#' + getQuery(_.omit(r, 'componentKey'));
    } else {
      return baseUrl + '/issues/search#' + getQuery(r);
    }
  });

  return Marionette.ItemView.extend({

    getTemplate: function () {
      var template = this.conf != null && this.conf.template != null ? this.conf.template : 'widget-issue-filter';
      return Templates[template];
    },

    initialize: function () {
      this.model = new Backbone.Model({
        query: this.options.query,
        parsedQuery: this.getParsedQuery(),
        property: this.options.distributionAxis,
        periodDate: this.options.periodDate
      });
      this.listenTo(this.model, 'change', this.render);
      this.conf = byDistributionConf[this.options.distributionAxis];
      this.query = this.getParsedQuery();
      this.requestIssues();
    },

    getParsedQuery: function () {
      var queryString = this.options.query || '',
          query = {};
      queryString.split('|').forEach(function (criterionString) {
        var criterion = criterionString.split('=');
        if (criterion.length === 2) {
          query[criterion[0]] = criterion[1];
        }
      });
      if (this.options.componentKey != null) {
        _.extend(query, { componentKey: this.options.componentKey });
      }
      if (this.options.periodDate != null) {
        _.extend(query, { createdAfter: this.options.periodDate });
      }
      return query;
    },

    sortItems: function (items) {
      var comparator = this.conf != null && this.conf.comparator != null ? this.conf.comparator : defaultComparator;
      return _.sortBy(items, comparator);
    },

    filterItems: function (items) {
      var filter = this.conf != null && this.conf.filter != null ? this.conf.filter : defaultFilter;
      return _.filter(items, filter, { query: this.query, property: this.options.distributionAxis });
    },

    withLink: function (items) {
      var link = this.conf != null && this.conf.link != null ? this.conf.link : defaultLink,
          property = this.options.distributionAxis,
          query = this.model.get('parsedQuery');
      return items.map(function (item, index) {
        return _.extend(item, { searchLink: link(item, property, query, index, items) });
      });
    },

    withLabels: function (items) {
      var label = this.conf != null && this.conf.label != null ? this.conf.label : defaultLabel,
          r = this.model.get('rawResponse'),
          query = this.model.get('parsedQuery');
      return items.map(function (item, index) {
        return _.extend(item, { label: label(item, r, items, index, query) });
      });
    },

    requestIssues: function () {
      var that = this,
          url = baseUrl + '/api/issues/search',
          options = _.extend({}, this.query, {
            ps: 1,
            facets: this.options.distributionAxis
          });
      if (this.options.componentUuid != null) {
        _.extend(options, { componentUuids: this.options.componentUuid });
      }
      if (this.options.periodDate != null) {
        _.extend(options, { createdAfter: this.options.periodDate });
      }
      return $.get(url, options).done(function (r) {
        if (_.isArray(r.facets) && r.facets.length === 1) {
          // save response object, but do not trigger repaint
          that.model.set({ rawResponse: r }, { silent: true });
          that.model.set({
            items: that.sortItems(that.withLabels(that.withLink(that.filterItems(r.facets[0].values)))),
            total: r.total
          });
        }
      });
    }
  });

});
