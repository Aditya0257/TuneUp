/**
 * A small, dependency-free collapsible JSON tree. Good enough for req/res
 * bodies in the dev drawer -- not trying to be a general-purpose viewer.
 */
interface JsonViewProps {
  value: unknown;
  /** Object/array nodes start expanded up to this depth. */
  depth?: number;
  maxAutoExpandDepth?: number;
}

export function JsonView({ value, depth = 0, maxAutoExpandDepth = 1 }: JsonViewProps) {
  if (value === null || value === undefined) {
    return <span className="devjson_null">{value === null ? 'null' : 'undefined'}</span>;
  }

  if (typeof value === 'string') {
    return <span className="devjson_string">&quot;{value}&quot;</span>;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span className="devjson_scalar">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="devjson_scalar">[]</span>;
    return (
      <details open={depth < maxAutoExpandDepth} className="devjson_node">
        <summary>
          Array<span className="devjson_count">({value.length})</span>
        </summary>
        <div className="devjson_children">
          {value.map((item, index) => (
            <div className="devjson_row" key={index}>
              <span className="devjson_key">{index}:</span>{' '}
              <JsonView value={item} depth={depth + 1} maxAutoExpandDepth={maxAutoExpandDepth} />
            </div>
          ))}
        </div>
      </details>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return <span className="devjson_scalar">{'{}'}</span>;
    return (
      <details open={depth < maxAutoExpandDepth} className="devjson_node">
        <summary>
          Object<span className="devjson_count">({keys.length})</span>
        </summary>
        <div className="devjson_children">
          {keys.map((key) => (
            <div className="devjson_row" key={key}>
              <span className="devjson_key">{key}:</span>{' '}
              <JsonView
                value={(value as Record<string, unknown>)[key]}
                depth={depth + 1}
                maxAutoExpandDepth={maxAutoExpandDepth}
              />
            </div>
          ))}
        </div>
      </details>
    );
  }

  return <span className="devjson_scalar">{String(value)}</span>;
}
