export const languages = [
  { code: 'ru', label: 'Русский', available: true },
  { code: 'en', label: 'English', available: false },
];

export const messages = {
  ru: {
    memoir: 'Мемуары', listen: 'Слушать историю', soon: 'Скоро',
    description: 'Слушайте онлайн или скачивайте главы, чтобы история всегда была рядом.',
    chapter: 'Глава', part: 'Часть', preface: 'Предисловие', afterword: 'Послесловие',
    introduction: 'Перед началом истории', conclusion: 'В завершение истории',
    play: 'Слушать', pause: 'Пауза', download: 'Скачать', mp3: 'MP3',
    mute: 'Выключить звук', unmute: 'Включить звук', seek: 'Позиция',
    resume: 'Продолжить', saved: 'Вы остановились здесь', completed: 'Прослушано',
    stopped: 'Остановились на', of: 'из', speed: 'Скорость',
    audioError: 'Не удалось загрузить аудио. Проверьте соединение и нажмите «Слушать» ещё раз. Файл также можно скачать.',
    playBlocked: 'Нажмите кнопку воспроизведения, чтобы продолжить.',
    storageError: 'Браузер запретил сохранение прогресса. Слушать книгу по-прежнему можно.',
    storageUnavailable: 'Сохранение прогресса недоступно в этом браузере. Разрешите хранение данных сайта, чтобы продолжать с места остановки.',
    reset: 'Сбросить прогресс прослушивания', resetDone: 'Прогресс прослушивания сброшен.',
    noteTitle: 'Ваша история продолжится',
    note: 'Мы запоминаем главу и место остановки в этом браузере. Возвращайтесь к книге в удобное время — регистрация не нужна.',
    storageDetail: 'Прогресс сохраняется на этом устройстве. Очистка данных браузера или приватный режим могут удалить его.',
    contents: 'К оглавлению', previous: 'Предыдущая глава', next: 'Следующая глава',
    backward: 'Назад на 15 секунд', forward: 'Вперёд на 15 секунд',
    skipLink: 'Перейти к главам', languageChoice: 'Выбрать язык', languageMenu: 'Язык сайта',
    partNavigation: 'Части аудиокниги', resumeRegion: 'Продолжить прослушивание',
    playerRegion: 'Аудиоплеер', seekGeneral: 'Позиция воспроизведения', speedControl: 'Скорость воспроизведения',
    stats: (duration) => `4 части · 24 главы · ${Math.floor(duration / 3600)} ч ${Math.floor(duration % 3600 / 60)} мин`,
    chapterRange: (start, end) => `Главы ${start}–${end}`,
    size: bytes => `${(bytes / (1024 * 1024)).toLocaleString('ru', { maximumFractionDigits: 1 })} МБ`,
  },
};
