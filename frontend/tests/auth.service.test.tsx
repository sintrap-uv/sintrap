import { signIn, signUp, signOut, getCurrentUser, resetPassword, verifyResetCode } from "../services/auth";
import { supabase } from "../services/supabase";
import { saveSession, clearSession } from "../services/authStorageService";

// Mocks de servicios
jest.mock("../services/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
    },
  },
}));

jest.mock("../services/authStorageService", () => ({
  saveSession: jest.fn(),
  clearSession: jest.fn(),
}));

const mockAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;
const mockSaveSession = saveSession as jest.Mock;
const mockClearSession = clearSession as jest.Mock;

const MOCK_SESSION = { access_token: "tok", refresh_token: "ref" };
const MOCK_USER    = { id: "uid-abc", email: "user@test.com" };

describe("Auth Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signIn", () => {
    it("llama signInWithPassword con email y contraseña", async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: MOCK_USER, session: MOCK_SESSION },
        error: null,
      });
      mockSaveSession.mockResolvedValue({ success: true });

      await signIn("user@test.com", "Password123");

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "Password123",
      });
    });

    it("guarda la sesión cuando el login es exitoso", async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: MOCK_USER, session: MOCK_SESSION },
        error: null,
      });
      mockSaveSession.mockResolvedValue({ success: true });

      await signIn("user@test.com", "Password123");
      expect(mockSaveSession).toHaveBeenCalledWith(MOCK_SESSION);
    });
  });

  describe("signOut", () => {
    it("limpia la sesión local cuando el logout es exitoso", async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });
      await signOut();
      expect(mockClearSession).toHaveBeenCalled();
    });
  });
});