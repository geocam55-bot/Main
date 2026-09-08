import fs from 'fs';
let content = fs.readFileSync('src/components/BackgroundJobProcessor.tsx', 'utf-8');

const injection = `
    const notifChannel = supabase
      .channel('global-notifications-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Notifications' },
        (payload) => {
          const newNotification = payload.new as any;
          if (newNotification.Type === 'Scraper Alert' || newNotification.Type === 'System Alert') {
            import('../utils/notifications').then(({ sendSystemNotification }) => {
              sendSystemNotification(newNotification.Type, {
                body: newNotification.Message,
                icon: '/favicon.svg',
                badge: '/favicon.svg'
              });
            });
            import('sonner@2.0.3').then(({ toast }) => {
               toast.info(newNotification.Message);
            });
          }
        }
      )
      .subscribe();
`;

// Insert it at the top of the useEffect block inside checkAndProcessDueJobs or just inside useEffect
content = content.replace(
  '    healSchema();',
  '    healSchema();\n' + injection
);

// We also need to clear it on unmount
content = content.replace(
  'return () => clearInterval(intervalId);',
  'return () => {\n      clearInterval(intervalId);\n      supabase.removeChannel(notifChannel);\n    };'
);

fs.writeFileSync('src/components/BackgroundJobProcessor.tsx', content);
