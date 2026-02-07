import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import PostSiteLayout from '@/layouts/PostSiteLayout';
import { postSiteService } from '@/lib/api/postSiteService';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Overview from './components/PostsiteOverview/Overview';
import Profile from './components/PostsiteProfile/Profile';
import Contacts from './components/PostsiteContacts/Contacts';
import KPIs from './components/PostSiteKPIs/PostSiteKPIs';
import PostOrders from './components/PostsitePostOrders/PostOrders';
import Notes from './components/PostsiteNotes/Notes';
import Files from './components/PostsiteFiles/Files';
import AssignGuards from './components/PostsiteAssignGuards/AssignGuards';
import Tasks from './components/PostsiteTasks/Tasks';
import SiteTours from './components/PostsiteSiteTours/SiteTours';
import SiteTourTags from './components/PostsiteSiteTourTags/SiteTourTags';
import GeoFence from './components/PostsiteGeoFence/GeoFence';
import AssignReports from './components/PostsiteAssignReports/AssignReports';
import Checklists from './components/PostsiteChecklists/Checklists';
import EmailReports from './components/PostsiteEmailReports/EmailReports';
import PostsiteSetting from './components/PostsiteSetting/PostsiteSettings';
import { useTranslation } from "react-i18next";

export default function PostSiteDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [site, setSite] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  const currentTab = parts[2] || 'overview';

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await postSiteService.get(id);
        if (!mounted) return;
        setSite(data);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || `${t('postsite.Details.unexpected', 'Unexpected error occurred')}`);
        toast.error(`${t('postsite.Details.unexpected', 'Unexpected error occurred')}`);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  const renderTab = () => {
    switch (currentTab) {
      case 'overview':
        return <Overview site={site} />;
      case 'profile':
        return <Profile site={site} />;
      case 'contacts':
        return <Contacts site={site} />;
      case 'kpis':
        return <KPIs site={site} />;
      case 'post-orders':
        return <PostOrders site={site} />;
      case 'notes':
        return <Notes site={site} />;
      case 'files':
        return <Files site={site} />;
      case 'assign-guards':
        return <AssignGuards site={site} />;
      case 'tasks':
        return <Tasks site={site} />;
      case 'site-tours':
        return <SiteTours site={site} />;
      case 'site-tour-tags':
        return <SiteTourTags site={site} />;
      case 'geo-fence':
        return <GeoFence site={site} />;
      case 'assign-reports':
        return <AssignReports site={site} />;
      case 'checklists':
        return <Checklists site={site} />;
      case 'email-reports':
        return <EmailReports site={site} />;
      case 'settings':
        return <PostsiteSetting site={site} />;
      default:
        return <Overview site={site} />;
    }
  };

  

  return (
    <PostSiteLayout title={site?.name || t('postSites.Details.title', '-')} site={site}>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-orange-500" />
          </div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : site ? (
          <div className="space-y-4">{renderTab()}</div>
        ) : (
          <div>{t('postSites.Details.notfoundpostsite', 'No post sites found')}</div>
        )}
      </div>
    </PostSiteLayout>
  );
}
