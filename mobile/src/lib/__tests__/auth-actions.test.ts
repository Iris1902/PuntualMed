const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: { auth: {
    signInWithPassword: (...a: unknown[]) => mockSignInWithPassword(...a),
    signUp: (...a: unknown[]) => mockSignUp(...a),
    resetPasswordForEmail: (...a: unknown[]) => mockResetPasswordForEmail(...a),
    updateUser: (...a: unknown[]) => mockUpdateUser(...a),
  } },
}));

import { signIn } from "../auth-actions";
import { signUp as doSignUp } from "../auth-actions";
import { requestPasswordReset, updatePassword } from "../auth-actions";

describe("signIn", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns no error on success", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
    await expect(signIn("a@b.com", "pw")).resolves.toEqual({ error: null });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "pw" });
  });

  it("returns the error message on failure", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });
    await expect(signIn("a@b.com", "bad")).resolves.toEqual({ error: "Invalid login credentials" });
  });
});

describe("signUp", () => {
  afterEach(() => jest.clearAllMocks());

  it("flags needsConfirmation when no session is returned", async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
    const res = await doSignUp("a@b.com", "pw");
    expect(res).toEqual({ error: null, needsConfirmation: true });
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pw",
      options: { emailRedirectTo: "puntualmed://auth-callback" },
    });
  });

  it("returns the error message on failure", async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: { message: "User already registered" } });
    expect(await doSignUp("a@b.com", "pw")).toEqual({ error: "User already registered", needsConfirmation: false });
  });
});

describe("requestPasswordReset", () => {
  afterEach(() => jest.clearAllMocks());
  it("sends the reset email with the redirect", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    expect(await requestPasswordReset("a@b.com")).toEqual({ error: null });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith("a@b.com", { redirectTo: "puntualmed://auth-callback" });
  });
});

describe("updatePassword", () => {
  afterEach(() => jest.clearAllMocks());
  it("updates the user password", async () => {
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
    expect(await updatePassword("newpw")).toEqual({ error: null });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpw" });
  });
});
