# frozen_string_literal: true

require "spec_helper"

RSpec.describe UserCalloutsHelper do
  let_it_be(:user) { create(:user) }

  before do
    allow(helper).to receive(:current_user).and_return(user)
  end

  describe '.show_gke_cluster_integration_callout?' do
    let_it_be(:project) { create(:project) }

    subject { helper.show_gke_cluster_integration_callout?(project) }

    context 'when user can create a cluster' do
      before do
        allow(helper).to receive(:can?).with(anything, :create_cluster, anything)
          .and_return(true)
      end

      context 'when user has not dismissed' do
        before do
          allow(helper).to receive(:user_dismissed?).and_return(false)
        end

        context 'when active_nav_link is in the operations section' do
          before do
            allow(helper).to receive(:active_nav_link?).and_return(true)
          end

          it { is_expected.to be true }
        end

        context 'when active_nav_link is not in the operations section' do
          before do
            allow(helper).to receive(:active_nav_link?).and_return(false)
          end

          it { is_expected.to be false }
        end
      end

      context 'when user dismissed' do
        before do
          allow(helper).to receive(:user_dismissed?).and_return(true)
        end

        it { is_expected.to be false }
      end
    end

    context 'when user can not create a cluster' do
      before do
        allow(helper).to receive(:can?).with(anything, :create_cluster, anything)
          .and_return(false)
      end

      it { is_expected.to be false }
    end
  end

  describe '.show_admin_integrations_moved?' do
    subject { helper.show_admin_integrations_moved? }

    context 'when user has not dismissed' do
      before do
        allow(helper).to receive(:user_dismissed?).with(described_class::ADMIN_INTEGRATIONS_MOVED) { false }
      end

      it { is_expected.to be true }
    end

    context 'when user dismissed' do
      before do
        allow(helper).to receive(:user_dismissed?).with(described_class::ADMIN_INTEGRATIONS_MOVED) { true }
      end

      it { is_expected.to be false }
    end
  end

  describe '.show_customize_homepage_banner?' do
    let(:customize_homepage) { true }

    subject { helper.show_customize_homepage_banner?(customize_homepage) }

    context 'when user has not dismissed' do
      before do
        allow(helper).to receive(:user_dismissed?).with(described_class::CUSTOMIZE_HOMEPAGE) { false }
      end

      context 'when customize_homepage is set' do
        it { is_expected.to be true }
      end

      context 'when customize_homepage is false' do
        let(:customize_homepage) { false }

        it { is_expected.to be false }
      end
    end

    context 'when user dismissed' do
      before do
        allow(helper).to receive(:user_dismissed?).with(described_class::CUSTOMIZE_HOMEPAGE) { true }
      end

      it { is_expected.to be false }
    end
  end

  describe '.render_flash_user_callout' do
    it 'renders the flash_user_callout partial' do
      expect(helper).to receive(:render)
        .with(/flash_user_callout/, flash_type: :warning, message: 'foo', feature_name: 'bar')

      helper.render_flash_user_callout(:warning, 'foo', 'bar')
    end
  end
end
