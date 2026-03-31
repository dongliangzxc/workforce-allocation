import { Routes, Route, HashRouter as Router } from 'react-router';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard/index';
import Members from './pages/Members/index';
import Requirements from './pages/Requirements/index';
import Allocation from './pages/Allocation/index';
import Gantt from './pages/Gantt/index';
import Settings from './pages/Settings/index';
import History from './pages/History/index';
import HistoryView from './pages/History/HistoryView';

function App() {
    return (
        <div className="min-h-screen">
            <Router>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/"             element={<Dashboard />} />
                        <Route path="/members"      element={<Members />} />
                        <Route path="/requirements" element={<Requirements />} />
                        <Route path="/allocation"   element={<Allocation />} />
                        <Route path="/gantt"        element={<Gantt />} />
                        <Route path="/history"      element={<History />} />
                        <Route path="/history/:id"  element={<HistoryView />} />
                        <Route path="/settings"     element={<Settings />} />
                    </Route>
                </Routes>
            </Router>
        </div>
    );
}

export default App;
