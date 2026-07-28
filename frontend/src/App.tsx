import { useRef } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Backpage } from '@/components/Backpage';
import { SearchBar } from '@/components/SearchBar';
import { SideNav } from '@/components/SideNav';
import { DevDrawer } from '@/dev/DevDrawer';
import { useHorizontalDrag } from '@/hooks/useHorizontalDrag';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { LibraryPage } from '@/pages/LibraryPage';
import { PlaylistsPage } from '@/pages/PlaylistsPage';
import { SearchPage } from '@/pages/SearchPage';

/**
 * The persistent shell.
 *
 * The original index.html was both the shell *and* the home page, and
 * changePage.js swapped page bodies into `#home_DraggableDiv` by assigning
 * innerHTML. That destroyed every event listener inside it, which is why
 * `setInitialLikeIcons` and `sendLikedSongsToServer` had to be passed as
 * callbacks and re-run after each navigation.
 *
 * Here the search bar, sidebar and player live above the router, so they are
 * never unmounted. Notably: audio keeps playing across navigation, which it
 * could not do before -- the player markup only existed on the home page.
 */
export function App() {
  const draggableRef = useRef<HTMLDivElement>(null);
  useHorizontalDrag(draggableRef);

  return (
    <>
      <SearchBar />

      {/*
        Same element, same id and class as the original: main.scss styles
        `.homepage`, and the drag handler targets `#home_DraggableDiv`.
      */}
      <div className="homepage" id="home_DraggableDiv" ref={draggableRef}>
        {/*
          One drag handle, shared by every route, instead of five separate
          copies (one per page) that had drifted out of sync with each
          other -- some pages' handle rendered flush with the edge, some
          didn't, because each was positioned relative to that page's own
          box instead of one consistent reference point. This is always
          positioned relative to .homepage itself (this div), so it's
          identical regardless of which page is currently inside it.
        */}
        <div className="test_div" title="Drag to reveal the queue and player">
          <div className="vl" />
        </div>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/music" element={<LibraryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <Backpage />
      <SideNav />
      <DevDrawer />
    </>
  );
}
