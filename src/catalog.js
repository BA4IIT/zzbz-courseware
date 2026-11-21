/* 枣庄八中高中课件管理系统 · 教材与课程分类数据
 * 教材体系：统编版 / 人教版（2019 新课标）
 * 章节目录用于快速归档与筛选，可在后续维护中按学校实际教学计划增补。 */
(function () {
  'use strict';

  const SUBJECTS = [
    {
      id: 'chinese', name: '语文', short: '语', edition: '统编版', color: '#4a8fe7',
      books: [
        {
          id: 'yw-bx1', name: '必修上册', grades: ['高一'], chapters: [
            '第一单元 · 青春激扬', '第二单元 · 劳动光荣', '第三单元 · 生命的诗意', '第四单元 · 家乡文化生活',
            '第五单元 · 整本书阅读《乡土中国》', '第六单元 · 学习之道', '第七单元 · 自然情怀',
            '第八单元 · 词语积累与词语解释', '古诗词诵读'
          ]
        },
        {
          id: 'yw-bx2', name: '必修下册', grades: ['高一'], chapters: [
            '第一单元 · 中华文明之光', '第二单元 · 良知与悲悯', '第三单元 · 探索与创新', '第四单元 · 信息时代的语文生活',
            '第五单元 · 抱负与使命', '第六单元 · 观察与批判', '第七单元 · 整本书阅读《红楼梦》',
            '第八单元 · 责任与担当', '古诗词诵读'
          ]
        },
        {
          id: 'yw-xb1', name: '选择性必修上册', grades: ['高二'], chapters: [
            '第一单元 · 中国革命传统作品研习', '第二单元 · 中国传统文化经典研习',
            '第三单元 · 外国作家作品研习', '第四单元 · 逻辑的力量', '古诗词诵读'
          ]
        },
        {
          id: 'yw-xb2', name: '选择性必修中册', grades: ['高二'], chapters: [
            '第一单元 · 理论与经验', '第二单元 · 中国革命传统作品研习',
            '第三单元 · 中国传统文化经典研习', '第四单元 · 外国作家作品研习', '古诗词诵读'
          ]
        },
        {
          id: 'yw-xb3', name: '选择性必修下册', grades: ['高二'], chapters: [
            '第一单元 · 中国传统文化经典研习', '第二单元 · 中国现当代作家作品研习',
            '第三单元 · 中国传统文化经典研习', '第四单元 · 外国作家作品研习', '古诗词诵读'
          ]
        },
        {
          id: 'yw-gk', name: '高考复习', grades: ['高三'], review: true, chapters: [
            '现代文阅读Ⅰ · 信息类文本', '现代文阅读Ⅱ · 文学类文本', '文言文阅读', '古代诗歌鉴赏',
            '名篇名句默写', '语言文字运用', '作文与思辨表达', '整本书阅读与名著导读'
          ]
        }
      ]
    },
    {
      id: 'math', name: '数学', short: '数', edition: '人教A版', color: '#5878e0',
      books: [
        {
          id: 'sx-bx1', name: '必修第一册', grades: ['高一'], chapters: [
            '第一章 集合与常用逻辑用语', '第二章 一元二次函数、方程和不等式',
            '第三章 函数的概念与性质', '第四章 指数函数与对数函数', '第五章 三角函数'
          ]
        },
        {
          id: 'sx-bx2', name: '必修第二册', grades: ['高一'], chapters: [
            '第六章 平面向量及其应用', '第七章 复数', '第八章 立体几何初步',
            '第九章 统计', '第十章 概率'
          ]
        },
        {
          id: 'sx-xb1', name: '选择性必修第一册', grades: ['高二'], chapters: [
            '第一章 空间向量与立体几何', '第二章 直线和圆的方程', '第三章 圆锥曲线的方程'
          ]
        },
        {
          id: 'sx-xb2', name: '选择性必修第二册', grades: ['高二'], chapters: [
            '第四章 数列', '第五章 一元函数的导数及其应用'
          ]
        },
        {
          id: 'sx-xb3', name: '选择性必修第三册', grades: ['高二'], chapters: [
            '第六章 计数原理', '第七章 随机变量及其分布', '第八章 成对数据的统计分析'
          ]
        },
        {
          id: 'sx-gk', name: '高考复习', grades: ['高三'], review: true, chapters: [
            '集合与常用逻辑用语', '函数与导数', '三角函数与解三角形', '平面向量与复数',
            '数列', '立体几何', '解析几何', '概率与统计', '新定义与创新题型'
          ]
        }
      ]
    },
    {
      id: 'english', name: '英语', short: '英', edition: '人教版', color: '#2f9fd0',
      books: [
        {
          id: 'yy-bx1', name: '必修第一册', grades: ['高一'], chapters: [
            'Welcome Unit', 'Unit 1 Teenage Life', 'Unit 2 Travelling Around',
            'Unit 3 Sports and Fitness', 'Unit 4 Natural Disasters', 'Unit 5 Languages Around the World'
          ]
        },
        {
          id: 'yy-bx2', name: '必修第二册', grades: ['高一'], chapters: [
            'Unit 1 Cultural Heritage', 'Unit 2 Wildlife Protection', 'Unit 3 The Internet',
            'Unit 4 History and Traditions', 'Unit 5 Music'
          ]
        },
        {
          id: 'yy-bx3', name: '必修第三册', grades: ['高一', '高二'], chapters: [
            'Unit 1 Festivals and Celebrations', 'Unit 2 Morals and Virtues', 'Unit 3 Diverse Cultures',
            'Unit 4 Space Exploration', 'Unit 5 The Value of Money'
          ]
        },
        {
          id: 'yy-xb1', name: '选择性必修第一册', grades: ['高二'], chapters: [
            'Unit 1 People of Achievement', 'Unit 2 Looking into the Future', 'Unit 3 Fascinating Parks',
            'Unit 4 Body Language', 'Unit 5 Working the Land'
          ]
        },
        {
          id: 'yy-xb2', name: '选择性必修第二册', grades: ['高二'], chapters: [
            'Unit 1 Science and Scientists', 'Unit 2 Bridging Cultures', 'Unit 3 Food and Culture',
            'Unit 4 Journey Across a Vast Land', 'Unit 5 First Aid'
          ]
        },
        {
          id: 'yy-xb3', name: '选择性必修第三册', grades: ['高二'], chapters: [
            'Unit 1 Art', 'Unit 2 Healthy Lifestyle', 'Unit 3 Environmental Protection',
            'Unit 4 Adversity and Courage', 'Unit 5 Poems'
          ]
        },
        {
          id: 'yy-xb4', name: '选择性必修第四册', grades: ['高二', '高三'], chapters: [
            'Unit 1 Science Fiction', 'Unit 2 Iconic Attractions', 'Unit 3 Sea Exploration',
            'Unit 4 Sharing', 'Unit 5 Launching Your Career'
          ]
        },
        {
          id: 'yy-gk', name: '高考复习', grades: ['高三'], review: true, chapters: [
            '听力理解', '阅读理解', '七选五', '完形填空', '语法填空',
            '应用文写作', '读后续写', '词汇与语法专项'
          ]
        }
      ]
    },
    {
      id: 'physics', name: '物理', short: '物', edition: '人教版', color: '#6b7ee8',
      books: [
        {
          id: 'wl-bx1', name: '必修第一册', grades: ['高一'], chapters: [
            '第一章 运动的描述', '第二章 匀变速直线运动的研究',
            '第三章 相互作用——力', '第四章 运动和力的关系'
          ]
        },
        {
          id: 'wl-bx2', name: '必修第二册', grades: ['高一'], chapters: [
            '第五章 抛体运动', '第六章 圆周运动', '第七章 万有引力与宇宙航行',
            '第八章 机械能守恒定律'
          ]
        },
        {
          id: 'wl-bx3', name: '必修第三册', grades: ['高二'], chapters: [
            '第九章 静电场及其应用', '第十章 静电场中的能量', '第十一章 电路及其应用',
            '第十二章 电能 能量守恒定律', '第十三章 电磁感应与电磁波初步'
          ]
        },
        {
          id: 'wl-xb1', name: '选择性必修第一册', grades: ['高二'], chapters: [
            '第一章 动量守恒定律', '第二章 机械振动', '第三章 机械波', '第四章 光'
          ]
        },
        {
          id: 'wl-xb2', name: '选择性必修第二册', grades: ['高二'], chapters: [
            '第一章 安培力与洛伦兹力', '第二章 电磁感应', '第三章 交变电流',
            '第四章 电磁振荡与电磁波', '第五章 传感器'
          ]
        },
        {
          id: 'wl-xb3', name: '选择性必修第三册', grades: ['高三'], chapters: [
            '第一章 分子动理论', '第二章 气体、固体和液体', '第三章 热力学定律',
            '第四章 原子结构和波粒二象性', '第五章 原子核'
          ]
        },
        {
          id: 'wl-gk', name: '高考复习', grades: ['高三'], review: true, chapters: [
            '力学综合', '电磁学综合', '热学', '光学', '原子物理',
            '物理实验', '图像与临界问题', '计算题规范表达'
          ]
        }
      ]
    },
    {
      id: 'chemistry', name: '化学', short: '化', edition: '人教版', color: '#3fa7a3',
      books: [
        {
          id: 'hx-bx1', name: '必修第一册', grades: ['高一'], chapters: [
            '第一章 物质及其变化', '第二章 海水中的重要元素——钠和氯',
            '第三章 铁 金属材料', '第四章 物质结构 元素周期律'
          ]
        },
        {
          id: 'hx-bx2', name: '必修第二册', grades: ['高一'], chapters: [
            '第五章 化工生产中的重要非金属元素', '第六章 化学反应与能量',
            '第七章 有机化合物', '第八章 化学与可持续发展'
          ]
        },
        {
          id: 'hx-xb1', name: '选择性必修1', subtitle: '化学反应原理', grades: ['高二'], chapters: [
            '第一章 化学反应的热效应', '第二章 化学反应速率与化学平衡',
            '第三章 水溶液中的离子反应与平衡', '第四章 化学反应与电能'
          ]
        },
        {
          id: 'hx-xb2', name: '选择性必修2', subtitle: '物质结构与性质', grades: ['高二'], chapters: [
            '第一章 原子结构与性质', '第二章 分子结构与性质', '第三章 晶体结构与性质'
          ]
        },
        {
          id: 'hx-xb3', name: '选择性必修3', subtitle: '有机化学基础', grades: ['高二', '高三'], chapters: [
            '第一章 有机化合物的结构特点与研究方法', '第二章 烃', '第三章 烃的衍生物',
            '第四章 生物大分子', '第五章 合成高分子'
          ]
        },
        {
          id: 'hx-gk', name: '高考复习', grades: ['高三'], review: true, chapters: [
            '化学实验基础', '元素及其化合物', '化学反应原理', '物质结构与性质',
            '有机化学基础', '化工流程题', '化学计算', '图表与数据分析'
          ]
        }
      ]
    },
    {
      id: 'biology', name: '生物', short: '生', edition: '人教版', color: '#54b47d',
      books: [
        {
          id: 'sw-bx1', name: '必修1', subtitle: '分子与细胞', grades: ['高一'], chapters: [
            '第1章 走近细胞', '第2章 组成细胞的分子', '第3章 细胞的基本结构',
            '第4章 细胞的物质输入和输出', '第5章 细胞的能量供应和利用', '第6章 细胞的生命历程'
          ]
        },
        {
          id: 'sw-bx2', name: '必修2', subtitle: '遗传与进化', grades: ['高一'], chapters: [
            '第1章 遗传因子的发现', '第2章 基因和染色体的关系', '第3章 基因的本质',
            '第4章 基因的表达', '第5章 基因突变及其他变异', '第6章 生物的进化'
          ]
        },
        {
          id: 'sw-xb1', name: '选择性必修1', subtitle: '稳态与调节', grades: ['高二'], chapters: [
            '第1章 人体的内环境与稳态', '第2章 神经调节', '第3章 体液调节',
            '第4章 免疫调节', '第5章 植物生命活动的调节'
          ]
        },
        {
          id: 'sw-xb2', name: '选择性必修2', subtitle: '生物与环境', grades: ['高二'], chapters: [
            '第1章 种群及其动态', '第2章 群落及其演替',
            '第3章 生态系统及其稳定性', '第4章 人与环境'
          ]
        },
        {
          id: 'sw-xb3', name: '选择性必修3', subtitle: '生物技术与工程', grades: ['高二', '高三'], chapters: [
            '第1章 发酵工程', '第2章 细胞工程', '第3章 基因工程', '第4章 生物技术的安全性与伦理问题'
          ]
        },
        {
          id: 'sw-gk', name: '高考复习', grades: ['高三'], review: true, chapters: [
            '细胞生物学', '遗传与进化', '稳态与调节', '生物与环境',
            '生物技术与工程', '实验设计与探究', '图表曲线分析'
          ]
        }
      ]
    },
    {
      id: 'politics', name: '政治', short: '政', edition: '统编版', color: '#e1905f',
      books: [
        {
          id: 'zz-bx1', name: '必修1', subtitle: '中国特色社会主义', grades: ['高一'], chapters: [
            '第一课 社会主义从空想到科学、从理论到实践的发展', '第二课 只有社会主义才能救中国',
            '第三课 只有中国特色社会主义才能发展中国', '第四课 只有坚持和发展中国特色社会主义才能实现中华民族伟大复兴'
          ]
        },
        {
          id: 'zz-bx2', name: '必修2', subtitle: '经济与社会', grades: ['高一'], chapters: [
            '第一课 我国的生产资料所有制', '第二课 我国的社会主义市场经济体制',
            '第三课 我国的经济发展', '第四课 我国的个人收入分配与社会保障'
          ]
        },
        {
          id: 'zz-bx3', name: '必修3', subtitle: '政治与法治', grades: ['高一', '高二'], chapters: [
            '第一课 历史和人民的选择', '第二课 中国共产党的先进性', '第三课 坚持和加强党的全面领导',
            '第四课 人民民主专政的社会主义国家', '第五课 我国的根本政治制度', '第六课 我国的基本政治制度',
            '第七课 治国理政的基本方式', '第八课 法治中国建设', '第九课 全面依法治国的基本要求'
          ]
        },
        {
          id: 'zz-bx4', name: '必修4', subtitle: '哲学与文化', grades: ['高二'], chapters: [
            '第一课 时代精神的精华', '第二课 探究世界的本质', '第三课 把握世界的规律',
            '第四课 探索认识的奥秘', '第五课 寻觅社会的真谛', '第六课 实现人生的价值',
            '第七课 继承发展中华优秀传统文化', '第八课 学习借鉴外来文化的有益成果', '第九课 发展中国特色社会主义文化'
          ]
        },
        {
          id: 'zz-xb1', name: '选择性必修1', subtitle: '当代国际政治与经济', grades: ['高二'], chapters: [
            '第一课 国体与政体', '第二课 国家的结构形式', '第三课 多极化趋势', '第四课 和平与发展',
            '第五课 中国的外交', '第六课 走进经济全球化', '第七课 经济全球化与中国',
            '第八课 主要的国际组织', '第九课 中国与国际组织'
          ]
        },
        {
          id: 'zz-xb2', name: '选择性必修2', subtitle: '法律与生活', grades: ['高二'], chapters: [
            '第一课 在生活中学民法用民法', '第二课 依法有效保护财产权', '第三课 订约履约 诚信为本',
            '第四课 侵权责任与权利界限', '第五课 在和睦家庭中成长', '第六课 珍惜婚姻关系',
            '第七课 做个明白的劳动者', '第八课 自主创业与诚信经营', '第九课 纠纷的多元解决方式', '第十课 诉讼实现公平正义'
          ]
        },
        {
          id: 'zz-xb3', name: '选择性必修3', subtitle: '逻辑与思维', grades: ['高二', '高三'], chapters: [
            '第一课 走进思维世界', '第二课 把握逻辑要义', '第三课 领会科学思维', '第四课 准确把握概念',
            '第五课 正确运用判断', '第六课 掌握演绎推理方法', '第七课 学会归纳与类比推理',
            '第八课 把握辩证分合', '第九课 理解质量互变', '第十课 推动认识发展',
            '第十一课 创新思维要善于联想', '第十二课 创新思维要多路探索', '第十三课 创新思维要力求超前'
          ]
        },
        {
          id: 'zz-gk', name: '高考复习', grades: ['高三'], review: true, chapters: [
            '经济与社会', '政治与法治', '哲学与文化', '当代国际政治与经济',
            '法律与生活', '逻辑与思维', '时政热点专题', '主观题答题规范'
          ]
        }
      ]
    },
    {
      id: 'history', name: '历史', short: '史', edition: '统编版', color: '#b08a5b',
      books: [
        {
          id: 'ls-bx1', name: '必修上', subtitle: '中外历史纲要（上）', grades: ['高一'], chapters: [
            '第一单元 从中华文明起源到秦汉统一多民族封建国家的建立与巩固',
            '第二单元 三国两晋南北朝的民族交融与隋唐统一多民族封建国家的发展',
            '第三单元 辽宋夏金多民族政权的并立与元朝的统一',
            '第四单元 明清中国版图的奠定与面临的挑战',
            '第五单元 晚清时期的内忧外患与救亡图存',
            '第六单元 辛亥革命与中华民国的建立',
            '第七单元 中国共产党成立与新民主主义革命兴起',
            '第八单元 中华民族的抗日战争和人民解放战争',
            '第九单元 中华人民共和国成立和社会主义革命与建设',
            '第十单元 改革开放和社会主义现代化建设新时期'
          ]
        },
        {
          id: 'ls-bx2', name: '必修下', subtitle: '中外历史纲要（下）', grades: ['高一'], chapters: [
            '第一单元 古代文明的产生与发展', '第二单元 中古时期的世界', '第三单元 走向整体的世界',
            '第四单元 资本主义制度的确立', '第五单元 工业革命与马克思主义的诞生',
            '第六单元 世界殖民体系与亚非拉民族独立运动',
            '第七单元 两次世界大战、十月革命与国际秩序的演变',
            '第八单元 20世纪下半叶世界的新变化', '第九单元 当代世界发展特点与主要趋势'
          ]
        },
        {
          id: 'ls-xb1', name: '选择性必修1', subtitle: '国家制度与社会治理', grades: ['高二'], chapters: [
            '第一单元 政治制度', '第二单元 官员的选拔与管理', '第三单元 法律与教化',
            '第四单元 民族关系与国家关系', '第五单元 货币与赋税制度', '第六单元 基层治理与社会保障'
          ]
        },
        {
          id: 'ls-xb2', name: '选择性必修2', subtitle: '经济与社会生活', grades: ['高二'], chapters: [
            '第一单元 食物生产与社会生活', '第二单元 生产工具与劳作方式', '第三单元 商业贸易与日常生活',
            '第四单元 村落、城镇与居住环境', '第五单元 交通与社会变迁', '第六单元 医疗与公共卫生'
          ]
        },
        {
          id: 'ls-xb3', name: '选择性必修3', subtitle: '文化交流与传播', grades: ['高二'], chapters: [
            '第一单元 源远流长的中华文化', '第二单元 丰富多样的世界文化',
            '第三单元 人口迁徙、文化交融与认同', '第四单元 商路、贸易与文化交流',
            '第五单元 战争与文化交锋', '第六单元 文化的传承与保护'
          ]
        },
        {
          id: 'ls-gk', name: '高考复习', grades: ['高三'], review: true, chapters: [
            '中国古代史', '中国近代史', '中国现代史', '世界古代史', '世界近代史',
            '世界现代史', '史料实证与历史解释', '开放性试题训练'
          ]
        }
      ]
    },
    {
      id: 'geography', name: '地理', short: '地', edition: '人教版', color: '#48a98a',
      books: [
        {
          id: 'dl-bx1', name: '必修第一册', grades: ['高一'], chapters: [
            '第一章 宇宙中的地球', '第二章 地球上的大气', '第三章 地球上的水',
            '第四章 地貌', '第五章 植被与土壤', '第六章 自然灾害'
          ]
        },
        {
          id: 'dl-bx2', name: '必修第二册', grades: ['高一'], chapters: [
            '第一章 人口', '第二章 乡村和城镇', '第三章 产业区位因素',
            '第四章 交通运输布局与区域发展', '第五章 环境与发展'
          ]
        },
        {
          id: 'dl-xb1', name: '选择性必修1', subtitle: '自然地理基础', grades: ['高二'], chapters: [
            '第一章 地球的运动', '第二章 地表形态的塑造', '第三章 大气的运动',
            '第四章 水的运动', '第五章 自然环境的整体性与差异性'
          ]
        },
        {
          id: 'dl-xb2', name: '选择性必修2', subtitle: '区域发展', grades: ['高二'], chapters: [
            '第一章 区域与区域发展', '第二章 资源、环境与区域发展',
            '第三章 城市、产业与区域发展', '第四章 区际联系与区域协调发展'
          ]
        },
        {
          id: 'dl-xb3', name: '选择性必修3', subtitle: '资源、环境与国家安全', grades: ['高二', '高三'], chapters: [
            '第一章 自然环境与人类社会', '第二章 资源安全与国家安全',
            '第三章 环境安全与国家安全', '第四章 保障国家安全的资源、环境战略与行动'
          ]
        },
        {
          id: 'dl-gk', name: '高考复习', grades: ['高三'], review: true, chapters: [
            '自然地理原理', '人文地理原理', '区域地理', '资源、环境与国家安全',
            '地理图表判读', '地理信息技术', '综合题答题规范'
          ]
        }
      ]
    }
  ];

  const COURSE_TYPES = [
    { id: 'new', name: '新授课', short: '新', color: '#2f7fd8', desc: '新课导入、情境创设与知识建构' },
    { id: 'review', name: '复习课', short: '复', color: '#55a9e6', desc: '章节复习、单元梳理与知识网络' },
    { id: 'exercise', name: '习题课', short: '习', color: '#4fb3a5', desc: '例题精讲、变式训练与当堂检测' },
    { id: 'experiment', name: '实验课', short: '验', color: '#7b8ff0', desc: '实验演示、探究活动与操作规范' },
    { id: 'micro', name: '微课', short: '微', color: '#6aaede', desc: '重难点微讲解与碎片化学习' },
    { id: 'open', name: '公开课', short: '公', color: '#d9a044', desc: '示范课、优质课与教研展示' },
    { id: 'exam', name: '试卷讲评', short: '评', color: '#d47a6b', desc: '考情分析、错题归因与补偿训练' },
    { id: 'examprep', name: '备考专题', short: '备', color: '#8f7bd6', desc: '一轮二轮复习与高考专题突破' }
  ];

  const GRADES = [
    { id: '高一', name: '高一', color: '#4a8fe7', desc: '必修阶段' },
    { id: '高二', name: '高二', color: '#55a9e6', desc: '选择性必修' },
    { id: '高三', name: '高三', color: '#6b7ee8', desc: '复习备考' }
  ];

  // 统一的身份证号（ID）与索引，避免界面层重复计算。
  const catalog = SUBJECTS.map((subject) => ({
    ...subject,
    chaptersCount: subject.books.reduce((sum, book) => sum + book.chapters.length, 0),
    books: subject.books.map((book) => ({
      ...book,
      subjectId: subject.id,
      chapters: book.chapters.map((name, index) => ({
        id: `${book.id}-c${index + 1}`,
        name,
        index: index + 1,
        bookId: book.id,
        subjectId: subject.id
      }))
    }))
  }));

  const books = catalog.flatMap((subject) => subject.books);
  const chapters = books.flatMap((book) => book.chapters);

  const subjectById = Object.fromEntries(catalog.map((s) => [s.id, s]));
  const bookById = Object.fromEntries(books.map((b) => [b.id, b]));
  const chapterById = Object.fromEntries(chapters.map((c) => [c.id, c]));
  const typeById = Object.fromEntries(COURSE_TYPES.map((t) => [t.id, t]));

  window.ZZBZ_DATA = {
    catalog,
    books,
    chapters,
    courseTypes: COURSE_TYPES,
    grades: GRADES,
    subjectById,
    bookById,
    chapterById,
    typeById,
    stats: {
      subjects: catalog.length,
      books: books.length,
      textbooks: books.filter((b) => !b.review).length,
      chapters: chapters.length,
      types: COURSE_TYPES.length
    }
  };
})();
