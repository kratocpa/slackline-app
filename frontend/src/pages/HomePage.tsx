import { useState } from 'react';
import { useSlacklines, useDiary, useSlacklinerLines } from '../api/hooks';
import { useMapStore } from '../store/mapStore';
import { useFilterStore } from '../store/filterStore';
import { useAuthStore } from '../store/authStore';
import LeafletMap from '../components/Map/LeafletMap';
import SlacklineTable from '../components/SlacklineTable/SlacklineTable';
import DiaryTable from '../components/SlacklineTable/DiaryTable';
import DiaryStatsPanel from '../components/SlacklineTable/DiaryStatsPanel';
import SlacklinersTable from '../components/SlacklineTable/SlacklinersTable';
import FilterBar from '../components/SlacklineTable/FilterBar';
import LoginButton from '../components/Auth/LoginButton';
import SlacklineForm from '../components/SlacklineForm/SlacklineForm';

type Tab = 'slacklines' | 'diary' | 'slackliners';
type DiarySubTab = 'lines' | 'stats';

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('slacklines');
  const [diarySubTab, setDiarySubTab] = useState<DiarySubTab>('lines');

  // Slacklines tab state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showCreate, setShowCreate] = useState(false);

  // Diary tab state
  const [diaryPage, setDiaryPage] = useState(1);
  const [diaryPageSize, setDiaryPageSize] = useState(25);
  const [diarySortBy, setDiarySortBy] = useState('last_crossing_date');
  const [diarySortDir, setDiarySortDir] = useState('desc');

  // Slackliners tab — track selected user for map
  const [selectedSlacklinerUserId, setSelectedSlacklinerUserId] = useState<string | null>(null);

  const bounds = useMapStore((s) => s.bounds);
  const { search, state, region, sector, minRating } = useFilterStore();
  const user = useAuthStore((s) => s.user);

  const params: Record<string, any> = {
    page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir,
  };
  if (search) params.search = search;
  if (state) params.state = state;
  if (region) params.region = region;
  if (sector) params.sector = sector;
  if (minRating) params.min_rating = minRating;
  if (bounds) params.bounds = bounds;

  const { data, isLoading } = useSlacklines(params);

  const mapParams: Record<string, any> = { page: 1, page_size: 1000 };
  if (search) mapParams.search = search;
  if (state) mapParams.state = state;
  if (region) mapParams.region = region;
  if (sector) mapParams.sector = sector;
  if (minRating) mapParams.min_rating = minRating;
  const { data: mapData } = useSlacklines(mapParams);

  const diaryParams: Record<string, any> = {
    page: diaryPage, page_size: diaryPageSize,
    sort_by: diarySortBy, sort_dir: diarySortDir,
  };
  const { data: diaryData, isLoading: diaryLoading } = useDiary(diaryParams, !!user);

  // Fetch all diary items (for map markers) when on diary tab
  const diaryMapParams: Record<string, any> = { page: 1, page_size: 1000, sort_by: 'name', sort_dir: 'asc' };
  const { data: diaryMapData } = useDiary(diaryMapParams, !!user && tab === 'diary');

  // Fetch selected slackliner's lines for map markers
  const { data: slacklinerMapData } = useSlacklinerLines(
    selectedSlacklinerUserId ?? '',
    { page: 1, page_size: 1000, sort_by: 'name', sort_dir: 'asc' },
    tab === 'slackliners' && !!selectedSlacklinerUserId,
  );

  // Decide which items to show on the map
  const mapSlacklines =
    tab === 'diary' && user
      ? (diaryMapData?.items ?? [])
      : tab === 'slackliners' && selectedSlacklinerUserId
        ? (slacklinerMapData?.items ?? [])
        : (mapData?.items ?? []);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleDiarySort = (col: string) => {
    if (diarySortBy === col) setDiarySortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setDiarySortBy(col); setDiarySortDir('asc'); }
    setDiaryPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">
            <a href="/">🏋 Slackline App</a>
          </h1>
          <div className="flex items-center gap-4">
            {user && (
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                + New Slackline
              </button>
            )}
            <LoginButton />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {showCreate && (
          <div className="bg-white rounded-lg shadow p-6">
            <SlacklineForm onClose={() => setShowCreate(false)} />
          </div>
        )}
        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '400px' }}>
          <LeafletMap slacklines={mapSlacklines} />
        </div>

        {/* Main tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px px-4" aria-label="Tabs">
              <button
                onClick={() => { setTab('slacklines'); setSelectedSlacklinerUserId(null); }}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'slacklines'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                Slacklines
              </button>
              {user && (
                <button
                  onClick={() => { setTab('diary'); setSelectedSlacklinerUserId(null); }}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                    tab === 'diary'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}>
                  📓 Diary
                </button>
              )}
              <button
                onClick={() => setTab('slackliners')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'slackliners'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                👥 Slackliners
              </button>
            </nav>
          </div>

          {tab === 'slacklines' && (
            <>
              <FilterBar />
              <SlacklineTable
                data={data}
                isLoading={isLoading}
                page={page}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </>
          )}

          {tab === 'diary' && user && (
            <>
              {/* Diary sub-tabs */}
              <div className="border-b border-gray-100 px-4 flex gap-1 bg-gray-50">
                {(['lines', 'stats'] as DiarySubTab[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setDiarySubTab(st)}
                    className={`py-2 px-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
                      diarySubTab === st
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}>
                    {st === 'lines' ? 'My Lines' : 'Statistics'}
                  </button>
                ))}
              </div>

              {diarySubTab === 'lines' && (
                <DiaryTable
                  data={diaryData}
                  isLoading={diaryLoading}
                  page={diaryPage}
                  pageSize={diaryPageSize}
                  onPageChange={(p) => setDiaryPage(p)}
                  onPageSizeChange={(s) => { setDiaryPageSize(s); setDiaryPage(1); }}
                  sortBy={diarySortBy}
                  sortDir={diarySortDir}
                  onSort={handleDiarySort}
                />
              )}

              {diarySubTab === 'stats' && <DiaryStatsPanel />}
            </>
          )}

          {tab === 'slackliners' && (
            <SlacklinersTable onUserSelect={setSelectedSlacklinerUserId} />
          )}
        </div>
      </main>
    </div>
  );
}
