const initNotificationNamespace = (io) => {
  const notificationNamespace = io.of('/notifications');

  notificationNamespace.on('connection', () => {
    // ready for future notification events
  });
};

module.exports = { initNotificationNamespace };

