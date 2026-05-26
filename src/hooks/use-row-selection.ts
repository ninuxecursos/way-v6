import { useCallback, useMemo, useState } from "react";

/**
 * Hook leve para gerenciar seleção de linhas em tabelas administrativas.
 * Mantém um Set de ids selecionados e expõe helpers para toggle individual,
 * toggle de todos da página atual e clear.
 */
export function useRowSelection<TId extends string = string>() {
  const [selected, setSelected] = useState<Set<TId>>(new Set());

  const toggle = useCallback((id: TId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllOnPage = useCallback((ids: TId[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const has = useCallback((id: TId) => selected.has(id), [selected]);

  const isAllOnPageSelected = useCallback(
    (ids: TId[]) => ids.length > 0 && ids.every((id) => selected.has(id)),
    [selected],
  );

  const ids = useMemo(() => Array.from(selected), [selected]);
  const count = selected.size;

  return { selected, ids, count, toggle, toggleAllOnPage, clear, has, isAllOnPageSelected };
}