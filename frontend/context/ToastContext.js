import { useState, useContext, createContext } from "react";


const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState({
        visible: false,
        message: '',
        type: 'success'
    });

    //funcion para mostrar mensaje 
    const mostrarToast = (mensaje, tipo = 'success') => {
        setToast({
            visible: true,
            mensaje,
            tipo,
        })
        //ocultamos el mensaje despues de 3 segundo
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, 3000);
    };

    //Funciones especificas para cada tipo
    const showSuccess = (message) => mostrarToast(message, 'success');
    const showError = (message) => mostrarToast(message, 'Error');
    const showInfo = (message) => mostrarToast(message, 'info');
    const showwarning = (message) => mostrarToast(message, 'warning');

    //funcion para ocultar manualmente
    const hideToast = () => {
        setToast(prev => ({
            ...prev, visible: false
        }));
    }
    return (
        <ToastContext.Provider value={{
            showError,
            showSuccess,
            showInfo,
            showwarning,
            hideToast,
            toast,

        }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = ()=>{
    const contexto = useContext(ToastContext);

    if(!contexto){
        throw new Error('useToast debe usarse dentro de ToastProvider');
    }
    return contexto;
};