import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Port of searchSong.js.
 *
 * The original built the URL by string interpolation --
 * `/search?search=${searchedText}` -- with no encoding, so a query containing
 * "&" or "#" silently truncated. It then set the results heading via
 * `heading.innerHTML = searchedText`, which made the search box an XSS vector:
 * typing `<img src=x onerror=...>` executed. The query is a routed, encoded
 * param now and React escapes it on render.
 */
export function SearchBar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  // Keep the field in step with the URL (back/forward navigation).
  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="homepage_searchbar">
      <form onSubmit={handleSubmit} role="search">
        <div className="search_icon_and_bar">
          <input
            type="text"
            placeholder="Search"
            id="search-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-label="Search for songs, albums, artists or playlists"
          />
          <button type="submit" aria-label="Search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
