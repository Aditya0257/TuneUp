import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Port of the `.fixed_side_navbar` block plus changePage.js.
 *
 * changePage.js did client-side routing by XHR-ing a full Jinja page, parsing
 * it into a detached div, pulling out one element by id and assigning its
 * `outerHTML` into the live DOM -- then calling `history.pushState` and
 * manually re-running the scripts whose listeners the replacement had just
 * destroyed. That is what react-router does properly.
 */
const NAV_ITEMS = [
  { icon: 'fa-solid fa-house', label: 'Home', path: '/' },
  { icon: 'fa-solid fa-music', label: 'Library', path: '/music' },
] as const;

const DECORATIVE_ITEMS = [
  'fa-regular fa-folder',
  'fa-regular fa-user',
] as const;

export function SideNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="fixed_side_navbar">
      <div className="logo_box">
        <img src="/assets/images/tuneUp_logo.png" alt="TuneUp" />
      </div>
      <div className="navbar_sub_column">
        {NAV_ITEMS.map((item) => (
          <i
            key={item.path}
            className={`${item.icon}${pathname === item.path ? ' nav_active' : ''}`}
            role="link"
            tabIndex={0}
            aria-label={item.label}
            aria-current={pathname === item.path ? 'page' : undefined}
            onClick={() => navigate(item.path)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(item.path);
              }
            }}
          />
        ))}
        {/* Present in the original layout but never wired to anything. */}
        {DECORATIVE_ITEMS.map((icon) => (
          <i key={icon} className={icon} aria-hidden="true" />
        ))}
        <hr />
        <i className="fa-regular fa-star" aria-hidden="true" />
        <i className="fa-regular fa-folder-closed" aria-hidden="true" />
      </div>
      <div>
        <i className="fa-solid fa-gear" aria-hidden="true" />
      </div>
    </div>
  );
}
