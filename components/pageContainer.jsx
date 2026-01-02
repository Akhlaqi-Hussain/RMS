const PageContainer = ({ title, children }) => (
  <div
    className="md:p-6 min-h-screen rounded-lg md:shadow transition-all duration-300 md:border"
    style={{ borderColor: "var(--color-primary)" }}
  >
    <h2 className="text-3xl text-center md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
      {title}
    </h2>
    {children}
  </div>
);

export default PageContainer;
