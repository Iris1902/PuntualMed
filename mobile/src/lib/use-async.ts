import { useCallback, useEffect, useRef, useState } from "react";

type AsyncState<T> = { data: T | null; error: boolean; loading: boolean };

// Hook generico de carga async: corre fn al montar y expone reload.
export function useAsync<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: false,
    loading: true,
  });
  // fn suele cambiar de identidad en cada render; un ref evita re-suscripciones.
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const mounted = useRef(true);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: false }));
    fnRef.current()
      .then((data) => {
        if (mounted.current) setState({ data, error: false, loading: false });
      })
      .catch(() => {
        if (mounted.current) {
          setState((prev) => ({ data: prev.data, error: true, loading: false }));
        }
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    reload();
    return () => {
      mounted.current = false;
    };
  }, [reload]);

  return { ...state, reload };
}
