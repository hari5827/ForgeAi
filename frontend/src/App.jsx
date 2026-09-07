
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Workspace from "./pages/Workspace";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                    path="/workspace"
                    element={
                        <ProtectedRoute>
                            <Workspace />
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<Login />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;