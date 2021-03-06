import { mount } from '@vue/test-utils';
import {
  GlAlert,
  GlLoadingIcon,
  GlTable,
  GlAvatar,
  GlPagination,
  GlSearchBoxByType,
  GlTab,
  GlTabs,
  GlBadge,
} from '@gitlab/ui';
import { visitUrl, joinPaths, mergeUrlParams } from '~/lib/utils/url_utility';
import IncidentsList from '~/incidents/components/incidents_list.vue';
import TimeAgoTooltip from '~/vue_shared/components/time_ago_tooltip.vue';
import { I18N, INCIDENT_STATUS_TABS } from '~/incidents/constants';
import mockIncidents from '../mocks/incidents.json';

jest.mock('~/lib/utils/url_utility', () => ({
  visitUrl: jest.fn().mockName('visitUrlMock'),
  joinPaths: jest.fn().mockName('joinPaths'),
  mergeUrlParams: jest.fn().mockName('mergeUrlParams'),
}));

describe('Incidents List', () => {
  let wrapper;
  const newIssuePath = 'namespace/project/-/issues/new';
  const incidentTemplateName = 'incident';
  const incidentType = 'incident';
  const incidentsCount = {
    opened: 14,
    closed: 1,
    all: 16,
  };

  const findTable = () => wrapper.find(GlTable);
  const findTableRows = () => wrapper.findAll('table tbody tr');
  const findAlert = () => wrapper.find(GlAlert);
  const findLoader = () => wrapper.find(GlLoadingIcon);
  const findTimeAgo = () => wrapper.findAll(TimeAgoTooltip);
  const findDateColumnHeader = () =>
    wrapper.find('[data-testid="incident-management-created-at-sort"]');
  const findSearch = () => wrapper.find(GlSearchBoxByType);
  const findAssingees = () => wrapper.findAll('[data-testid="incident-assignees"]');
  const findCreateIncidentBtn = () => wrapper.find('[data-testid="createIncidentBtn"]');
  const findClosedIcon = () => wrapper.findAll("[data-testid='incident-closed']");
  const findPagination = () => wrapper.find(GlPagination);
  const findStatusFilterTabs = () => wrapper.findAll(GlTab);
  const findStatusFilterBadge = () => wrapper.findAll(GlBadge);
  const findStatusTabs = () => wrapper.find(GlTabs);

  function mountComponent({ data = { incidents: [], incidentsCount: {} }, loading = false }) {
    wrapper = mount(IncidentsList, {
      data() {
        return data;
      },
      mocks: {
        $apollo: {
          queries: {
            incidents: {
              loading,
            },
          },
        },
      },
      provide: {
        projectPath: '/project/path',
        newIssuePath,
        incidentTemplateName,
        incidentType,
        issuePath: '/project/isssues',
        publishedAvailable: true,
      },
      stubs: {
        GlButton: true,
        GlAvatar: true,
      },
    });
  }

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
      wrapper = null;
    }
  });

  it('shows the loading state', () => {
    mountComponent({
      loading: true,
    });
    expect(findLoader().exists()).toBe(true);
  });

  it('shows empty state', () => {
    mountComponent({
      data: { incidents: { list: [] }, incidentsCount: {} },
      loading: false,
    });
    expect(findTable().text()).toContain(I18N.noIncidents);
  });

  it('shows error state', () => {
    mountComponent({
      data: { incidents: { list: [] }, incidentsCount: { all: 0 }, errored: true },
      loading: false,
    });
    expect(findTable().text()).toContain(I18N.noIncidents);
    expect(findAlert().exists()).toBe(true);
  });

  describe('Incident Management list', () => {
    beforeEach(() => {
      mountComponent({
        data: { incidents: { list: mockIncidents }, incidentsCount },
        loading: false,
      });
    });

    it('renders rows based on provided data', () => {
      expect(findTableRows().length).toBe(mockIncidents.length);
    });

    it('renders a createdAt with timeAgo component per row', () => {
      expect(findTimeAgo().length).toBe(mockIncidents.length);
    });

    describe('Assignees', () => {
      it('shows Unassigned when there are no assignees', () => {
        expect(
          findAssingees()
            .at(0)
            .text(),
        ).toBe(I18N.unassigned);
      });

      it('renders an avatar component when there is an assignee', () => {
        const avatar = findAssingees()
          .at(1)
          .find(GlAvatar);
        const { src, label } = avatar.attributes();
        const { name, avatarUrl } = mockIncidents[1].assignees.nodes[0];

        expect(avatar.exists()).toBe(true);
        expect(label).toBe(name);
        expect(src).toBe(avatarUrl);
      });

      it('contains a link to the issue details', () => {
        findTableRows()
          .at(0)
          .trigger('click');
        expect(visitUrl).toHaveBeenCalledWith(joinPaths(`/project/isssues/`, mockIncidents[0].iid));
      });

      it('renders a closed icon for closed incidents', () => {
        expect(findClosedIcon().length).toBe(
          mockIncidents.filter(({ state }) => state === 'closed').length,
        );
      });
    });
  });

  describe('Create Incident', () => {
    beforeEach(() => {
      mountComponent({
        data: { incidents: { list: [] }, incidentsCount: {} },
        loading: false,
      });
    });

    it('shows the button linking to new incidents page with prefilled incident template when clicked', () => {
      expect(findCreateIncidentBtn().exists()).toBe(true);
      findCreateIncidentBtn().trigger('click');
      expect(mergeUrlParams).toHaveBeenCalledWith(
        { issuable_template: incidentTemplateName, 'issue[issue_type]': incidentType },
        newIssuePath,
      );
    });

    it('sets button loading on click', () => {
      findCreateIncidentBtn().vm.$emit('click');
      return wrapper.vm.$nextTick().then(() => {
        expect(findCreateIncidentBtn().attributes('loading')).toBe('true');
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mountComponent({
        data: {
          incidents: {
            list: mockIncidents,
            pageInfo: { hasNextPage: true, hasPreviousPage: true },
          },
          incidentsCount,
          errored: false,
        },
        loading: false,
      });
    });

    it('should render pagination', () => {
      expect(wrapper.find(GlPagination).exists()).toBe(true);
    });

    describe('prevPage', () => {
      it('returns prevPage button', () => {
        findPagination().vm.$emit('input', 3);

        return wrapper.vm.$nextTick(() => {
          expect(
            findPagination()
              .findAll('.page-item')
              .at(0)
              .text(),
          ).toBe('Prev');
        });
      });

      it('returns prevPage number', () => {
        findPagination().vm.$emit('input', 3);

        return wrapper.vm.$nextTick(() => {
          expect(wrapper.vm.prevPage).toBe(2);
        });
      });

      it('returns 0 when it is the first page', () => {
        findPagination().vm.$emit('input', 1);

        return wrapper.vm.$nextTick(() => {
          expect(wrapper.vm.prevPage).toBe(0);
        });
      });
    });

    describe('nextPage', () => {
      it('returns nextPage button', () => {
        findPagination().vm.$emit('input', 3);

        return wrapper.vm.$nextTick(() => {
          expect(
            findPagination()
              .findAll('.page-item')
              .at(1)
              .text(),
          ).toBe('Next');
        });
      });

      it('returns nextPage number', () => {
        mountComponent({
          data: {
            incidents: {
              list: [...mockIncidents, ...mockIncidents, ...mockIncidents],
              pageInfo: { hasNextPage: true, hasPreviousPage: true },
            },
            incidentsCount,
            errored: false,
          },
          loading: false,
        });
        findPagination().vm.$emit('input', 1);

        return wrapper.vm.$nextTick(() => {
          expect(wrapper.vm.nextPage).toBe(2);
        });
      });

      it('returns `null` when currentPage is already last page', () => {
        findStatusTabs().vm.$emit('input', 1);
        findPagination().vm.$emit('input', 1);
        return wrapper.vm.$nextTick(() => {
          expect(wrapper.vm.nextPage).toBeNull();
        });
      });
    });

    describe('Search', () => {
      beforeEach(() => {
        mountComponent({
          data: {
            incidents: {
              list: mockIncidents,
              pageInfo: { hasNextPage: true, hasPreviousPage: true },
            },
            incidentsCount,
            errored: false,
          },
          loading: false,
        });
      });

      it('renders the search component for incidents', () => {
        expect(findSearch().exists()).toBe(true);
      });

      it('sets the `searchTerm` graphql variable', () => {
        const SEARCH_TERM = 'Simple Incident';

        findSearch().vm.$emit('input', SEARCH_TERM);

        expect(wrapper.vm.$data.searchTerm).toBe(SEARCH_TERM);
      });
    });

    describe('Status Filter Tabs', () => {
      beforeEach(() => {
        mountComponent({
          data: { incidents: mockIncidents, incidentsCount },
          loading: false,
          stubs: {
            GlTab: true,
          },
        });
      });

      it('should display filter tabs', () => {
        const tabs = findStatusFilterTabs().wrappers;

        tabs.forEach((tab, i) => {
          expect(tab.attributes('data-testid')).toContain(INCIDENT_STATUS_TABS[i].status);
        });
      });

      it('should display filter tabs with alerts count badge for each status', () => {
        const tabs = findStatusFilterTabs().wrappers;
        const badges = findStatusFilterBadge();

        tabs.forEach((tab, i) => {
          const status = INCIDENT_STATUS_TABS[i].status.toLowerCase();
          expect(tab.attributes('data-testid')).toContain(INCIDENT_STATUS_TABS[i].status);
          expect(badges.at(i).text()).toContain(incidentsCount[status]);
        });
      });
    });
  });

  describe('sorting the incident list by column', () => {
    beforeEach(() => {
      mountComponent({
        data: { incidents: mockIncidents, incidentsCount },
        loading: false,
      });
    });

    it('updates sort with new direction and column key', () => {
      expect(findDateColumnHeader().attributes('aria-sort')).toBe('descending');

      findDateColumnHeader().trigger('click');
      return wrapper.vm.$nextTick(() => {
        expect(findDateColumnHeader().attributes('aria-sort')).toBe('ascending');
      });
    });
  });
});
