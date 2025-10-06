import FileManager from "../../components/FileManager";
import PortalStatus from "../../components/PortalStatus";

export default function PhotosPage() {
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-2">Your Photos</h1>
      <PortalStatus />
      <FileManager />
    </div>
  );
}
