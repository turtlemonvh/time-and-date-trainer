import DebugQuestionsPage from './DebugQuestionsPage';

export const DEBUG_PREFIX = '/debug/';

/**
 * Dev-only screen switch. The game itself has no URL routing — screens are
 * driven by app state — so this deliberately is not a router library, just a
 * `switch` over the path suffix. Add a `case` per debug screen:
 * `sprites` in M2, `widgets` in M3.
 *
 * Rendered only from `main.tsx`, and only behind `import.meta.env.DEV`.
 */
export default function DebugRouter({ pathname }: { pathname: string }) {
  const route = pathname.startsWith(DEBUG_PREFIX)
    ? pathname.slice(DEBUG_PREFIX.length).replace(/\/+$/, '')
    : '';

  switch (route) {
    case 'questions':
      return <DebugQuestionsPage />;
    default:
      return (
        <main>
          <h1>Unknown debug route</h1>
          <p>
            No debug screen is registered for <code>{pathname}</code>.
          </p>
          <ul>
            <li>
              <a href="/debug/questions">/debug/questions</a>
            </li>
          </ul>
        </main>
      );
  }
}
