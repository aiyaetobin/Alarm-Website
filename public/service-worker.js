let storedAlarm = null;
let alarmCheckInterval = null;

self.addEventListener('install', (event) =>
{
    console.log('Service Worker Installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) =>
{
    console.log('Service Worker Activated');
    event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) =>
{
    if (event.data.type === 'SET_ALARM')
    {
        console.log('Service Worker received alarm:', event.data.alarm);
        storedAlarm = event.data.alarm;

        if (alarmCheckInterval) clearInterval(alarmCheckInterval);
        alarmCheckInterval = setInterval(() =>
        {
            fetch('/alarm')
                .then(res => res.json())
                .then(data =>
                {
                    storedAlarm = data.alarm;
                    checkAlarmTime();
                })
                .catch(err => console.error('Error fetching alarm:', err));
        }, 10000);
    }
});

function checkAlarmTime()
{
    if (!storedAlarm || !storedAlarm.alarm_time) return;

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    const alarmTimeShort = storedAlarm.alarm_time.substring(0, 5);

    if (currentTime === alarmTimeShort)
    {
        console.log('Service Worker: Alarm time reached!');

        self.registration.showNotification('Alarm!', {
            body: `Time to move ${storedAlarm.alarm_distance}m!`,
            icon: '/favicon.ico',
            tag: 'alarm-notification',
            requireInteraction: true
        });

        clearInterval(alarmCheckInterval);
        storedAlarm = null;
    }
}