import { renderHook, waitFor } from "@testing-library/react-native";
import { useAsync } from "../use-async";

describe("useAsync", () => {
  it("starts loading then exposes resolved data", async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve(42)));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(42);
    expect(result.current.error).toBe(false);
  });

  it("sets error when the promise rejects", async () => {
    const { result } = renderHook(() =>
      useAsync(() => Promise.reject(new Error("boom"))),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("reload re-runs the function", async () => {
    let n = 0;
    const { result } = renderHook(() => useAsync(() => Promise.resolve(++n)));
    await waitFor(() => expect(result.current.data).toBe(1));
    result.current.reload();
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
