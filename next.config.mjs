/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile FullCalendar packages for Next.js compatibility
  transpilePackages: [
    '@fullcalendar/core',
    '@fullcalendar/react',
    '@fullcalendar/daygrid',
    '@fullcalendar/timegrid',
    '@fullcalendar/interaction',
  ],
};

export default nextConfig;
