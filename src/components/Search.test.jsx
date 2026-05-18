import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import Search from './Search';

// Ensure DOM is cleaned up between every test (including PBT iterations)
afterEach(() => cleanup());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render Search in an isolated container so PBT iterations don't bleed into
 * each other. Returns RTL queries scoped to that container plus a cleanup fn.
 */
function renderSearch(props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const result = render(<Search {...props} />, { container });
  return {
    ...result,
    cleanup: () => {
      result.unmount();
      container.remove();
    },
  };
}

/**
 * Set the value of a controlled input via fireEvent.change.
 * Avoids userEvent.type's special-character parsing (e.g. "{", "}" are
 * interpreted as key descriptors by userEvent).
 */
function setInputValue(input, value) {
  fireEvent.change(input, { target: { value } });
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Non-empty, non-whitespace-only strings (printable ASCII for safety) */
const arbitraryNonEmptyCity = () =>
  fc
    .string({ minLength: 1, maxLength: 30 })
    .filter((s) => s.trim() !== '');

/** Whitespace-only strings (including empty string) */
const arbitraryWhitespaceString = () =>
  fc.oneof(
    fc.constant(''),
    fc
      .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
      .map((chars) => chars.join(''))
  );

// ---------------------------------------------------------------------------
// Unit tests — example-based
// ---------------------------------------------------------------------------

describe('Search — unit tests', () => {
  it('renders an input and a submit button (Req 1.1)', () => {
    render(<Search onSearch={vi.fn()} loading={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument();
  });

  it('calls onSearch with the typed city when button is clicked (Req 1.3)', async () => {
    const onSearch = vi.fn();
    render(<Search onSearch={onSearch} loading={false} />);
    await userEvent.type(screen.getByRole('textbox'), 'Madrid');
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith('Madrid');
  });

  it('calls onSearch when Enter is pressed (Req 1.2)', async () => {
    const onSearch = vi.fn();
    render(<Search onSearch={onSearch} loading={false} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Tokyo');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith('Tokyo');
  });

  it('shows validation message and does not call onSearch for empty input (Req 1.4)', async () => {
    const onSearch = vi.fn();
    render(<Search onSearch={onSearch} loading={false} />);
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe una ciudad');
  });

  it('clears the input after invoking onSearch (Req 1.5)', async () => {
    const onSearch = vi.fn();
    render(<Search onSearch={onSearch} loading={false} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Paris');
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(input).toHaveValue('');
  });

  it('disables the button when loading is true (Req 4.3)', () => {
    render(<Search onSearch={vi.fn()} loading={true} />);
    expect(screen.getByRole('button', { name: /buscar/i })).toBeDisabled();
  });

  it('enables the button when loading is false', () => {
    render(<Search onSearch={vi.fn()} loading={false} />);
    expect(screen.getByRole('button', { name: /buscar/i })).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

/**
 * Property 1: Búsqueda dispara onSearch con el valor ingresado
 * Validates: Requirements 1.2, 1.3
 */
describe('Property 1 — search fires onSearch with the typed value', () => {
  it(
    'button click: onSearch called once with the exact city string',
    () => {
      fc.assert(
        fc.property(arbitraryNonEmptyCity(), (city) => {
          const onSearch = vi.fn();
          const { cleanup: cleanupRender, getByRole } = renderSearch({
            onSearch,
            loading: false,
          });
          setInputValue(getByRole('textbox'), city);
          fireEvent.click(getByRole('button', { name: /buscar/i }));
          expect(onSearch).toHaveBeenCalledOnce();
          expect(onSearch).toHaveBeenCalledWith(city);
          cleanupRender();
        }),
        { numRuns: 50 }
      );
    },
    15000
  );

  it(
    'Enter key: onSearch called once with the exact city string',
    () => {
      fc.assert(
        fc.property(arbitraryNonEmptyCity(), (city) => {
          const onSearch = vi.fn();
          const { cleanup: cleanupRender, getByRole } = renderSearch({
            onSearch,
            loading: false,
          });
          const input = getByRole('textbox');
          setInputValue(input, city);
          fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
          expect(onSearch).toHaveBeenCalledOnce();
          expect(onSearch).toHaveBeenCalledWith(city);
          cleanupRender();
        }),
        { numRuns: 50 }
      );
    },
    15000
  );
});

/**
 * Property 2: Input vacío o solo-whitespace es rechazado
 * Validates: Requirements 1.4
 */
describe('Property 2 — empty/whitespace input is rejected', () => {
  it(
    'does not call onSearch and shows validation message for whitespace-only input',
    () => {
      fc.assert(
        fc.property(arbitraryWhitespaceString(), (whitespace) => {
          const onSearch = vi.fn();
          const { cleanup: cleanupRender, getByRole } = renderSearch({
            onSearch,
            loading: false,
          });
          setInputValue(getByRole('textbox'), whitespace);
          fireEvent.click(getByRole('button', { name: /buscar/i }));
          expect(onSearch).not.toHaveBeenCalled();
          expect(getByRole('alert')).toHaveTextContent('Escribe una ciudad');
          cleanupRender();
        }),
        { numRuns: 50 }
      );
    },
    15000
  );
});

/**
 * Property 3: El campo de búsqueda se limpia tras invocar onSearch
 * Validates: Requirements 1.5
 */
describe('Property 3 — input is cleared after onSearch is invoked', () => {
  it(
    'input value is empty string after a successful search',
    () => {
      fc.assert(
        fc.property(arbitraryNonEmptyCity(), (city) => {
          const onSearch = vi.fn();
          const { cleanup: cleanupRender, getByRole } = renderSearch({
            onSearch,
            loading: false,
          });
          const input = getByRole('textbox');
          setInputValue(input, city);
          fireEvent.click(getByRole('button', { name: /buscar/i }));
          expect(input).toHaveValue('');
          cleanupRender();
        }),
        { numRuns: 50 }
      );
    },
    15000
  );
});

/**
 * Property 9: El botón de búsqueda está deshabilitado durante la carga
 * Validates: Requirements 4.3
 */
describe('Property 9 — button is disabled when loading is true', () => {
  it(
    'button has disabled attribute for any city value when loading=true',
    () => {
      fc.assert(
        fc.property(arbitraryNonEmptyCity(), (city) => {
          const { cleanup: cleanupRender, getByRole } = renderSearch({
            onSearch: vi.fn(),
            loading: true,
          });
          expect(getByRole('button', { name: /buscar/i })).toBeDisabled();
          cleanupRender();
        }),
        { numRuns: 50 }
      );
    },
    15000
  );
});
