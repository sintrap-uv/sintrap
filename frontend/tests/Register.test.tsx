import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import Register from "../app/profiles/register";
import { signUp } from "../services/auth";
import { createProfile } from "../services/profileService";

// Mocks de navegación e iconos
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: mockPush, back: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  FontAwesome: "FontAwesome",
  MaterialIcons: "MaterialIcons",
}));

// Mocks de servicios
jest.mock("../services/auth", () => ({
  signUp: jest.fn(),
}));

jest.mock("../services/profileService", () => ({
  createProfile: jest.fn(),
}));

const mockSignUp = signUp as jest.MockedFunction<typeof signUp>;
const mockCreateProfile = createProfile as jest.MockedFunction<typeof createProfile>;

describe("Register Screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Definir alert globalmente para evitar ReferenceError
    global.alert = jest.fn();
  });

  it("flujo exitoso: registra usuario, crea perfil y muestra alerta", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-123" }, session: null },
      error: null,
      pendingEmailConfirmation: true,
    });
    mockCreateProfile.mockResolvedValue({ error: null });

    const { getByPlaceholderText, getByText } = render(<Register />);

    fireEvent.changeText(getByPlaceholderText("Nombre completo"), "Johann");
    fireEvent.changeText(getByPlaceholderText("Correo electronico"), "johann@test.com");
    fireEvent.changeText(getByPlaceholderText("Contraseña"), "Password11");
    fireEvent.changeText(getByPlaceholderText("Confirmar contraseña"), "Password11");
    
    fireEvent.press(getByText("Crear cuenta"));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith("johann@test.com", "Password11");
      expect(mockCreateProfile).toHaveBeenCalled();
      // Verifica que la alerta se llamó
      expect(global.alert).toHaveBeenCalledWith("Registro exitoso");
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});