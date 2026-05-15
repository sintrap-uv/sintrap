import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import Login from "../app/login";
import { signIn } from "../services/auth";

// Mock de AsyncStorage necesario para este archivo
jest.mock('@react-native-async-storage/async-storage', () => 
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

jest.mock("../services/auth", () => ({
  signIn: jest.fn(),
}));

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

describe("Login Screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
  });

  it("redirige a /home tras un inicio de sesión exitoso", async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: "1" }, session: { token: "abc" } },
      error: null,
    });

    const { getByPlaceholderText, getByText } = render(<Login />);

    fireEvent.changeText(getByPlaceholderText("Correo electronico"), "test@test.com");
    fireEvent.changeText(getByPlaceholderText("Contraseña"), "Pass123");
    fireEvent.press(getByText("Inicio sesión"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/home");
    });
  });
});