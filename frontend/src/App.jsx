import { Routes, Route } from "react-router-dom";
import { Header } from "./components/Header.jsx";
import { SearchView } from "./views/SearchView.jsx";
import { TeamDetailView } from "./views/TeamDetailView.jsx";

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<SearchView />} />
          <Route path="/team/:teamId" element={<TeamDetailView />} />
        </Routes>
      </main>
    </>
  );
}