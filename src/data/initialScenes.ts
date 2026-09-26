import { GameScene } from '../types';
import jrpgImg from '../assets/images/jrpg_fantasy_dialogue_1790439924564.jpg';
import cyberpunkImg from '../assets/images/cyberpunk_rpg_scene_1790439936004.jpg';

export const INITIAL_GAME_SCENES: GameScene[] = [
  {
    id: 'scene_jrpg',
    title: 'Elden Fantasy: Twilight Spire',
    genre: 'rpg',
    image: jrpgImg,
    defaultProfileId: 'elden_fantasy',
    questObjective: 'Main Quest: Reach the Ancient Temple before twilight fades to commune with the Maiden.',
    dialogues: [
      {
        speaker: 'アルウェン (Arwen)',
        text: '日没前に古代の寺院を見つけてください。黄昏の光が消える前に急がねばなりません。',
        lang: 'ja',
        contextHint: 'Urgent solemn instruction before monsters emerge at nightfall.',
      },
      {
        speaker: 'アルウェン (Arwen)',
        text: '祝福の導きはかすかに揺らいでいます。選ばれし者よ、恐れず進みなさい。',
        lang: 'ja',
        contextHint: 'Offering guidance to the player character.',
      },
      {
        speaker: 'Narrator',
        text: 'The Ancient Temple looms beyond the misty crags. Whispers of the Elden Maiden echo through the stone halls.',
        lang: 'en',
        contextHint: 'World atmospheric description.',
      },
      {
        speaker: 'Ранни (Ranni)',
        text: 'Найдите древний храм до заката. Тьма поглотит тех, кто замедлит шаг.',
        lang: 'ru',
        contextHint: 'Warning in Russian language.',
      },
      {
        speaker: 'アルウェン (Arwen)',
        text: '在日落之前找到古老的神庙。我们没有多少时间了。',
        lang: 'zh',
        contextHint: 'Chinese dialogue variation.',
      },
      {
        speaker: 'Elven Sage',
        text: 'Finde den alten Tempel vor Sonnenuntergang, bevor die Siegel der Vorväter brechen.',
        lang: 'de',
        contextHint: 'German dialogue variation.',
      },
    ],
  },
  {
    id: 'scene_cyberpunk',
    title: 'Neon Syndicate: Neo-Shinjuku',
    genre: 'action',
    image: cyberpunkImg,
    defaultProfileId: 'cyberpunk_neon',
    questObjective: 'Contract Gig: Infiltrate Arasaka lower docks and extract the encrypted braindance chip.',
    dialogues: [
      {
        speaker: 'Viktor (Fixer)',
        text: 'Find the ancient temple before sunset. The syndicate operative is waiting at the lower docks with your credits.',
        lang: 'en',
        contextHint: 'Fixer briefing the mercenary via encrypted comm-link.',
      },
      {
        speaker: 'V (Mercenary)',
        text: 'Got it, choom. If Arasaka corporate security shows up, things are gonna get loud.',
        lang: 'en',
        contextHint: 'Protagonist acknowledging contract.',
      },
      {
        speaker: 'Viktor (Fixer)',
        text: 'Не суйся на рожон. Этот брейнданс стоит больше, чем вся твоя киберимплантология.',
        lang: 'ru',
        contextHint: 'Russian fixer warning.',
      },
      {
        speaker: 'Holo-Assistant',
        text: '日没前に古代の寺院を見つけてください。アラサカのドローンパトロールが接近中です。',
        lang: 'ja',
        contextHint: 'Japanese AI warning message.',
      },
      {
        speaker: 'Viktor (Fixer)',
        text: 'اعثر على المعبد القديم قبل غروب الشمس. العميل السري في انتظارك عند الأرصفة السفلية.',
        lang: 'ar',
        contextHint: 'Arabic translated voice transmission.',
      },
    ],
  },
];
