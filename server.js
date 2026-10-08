// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// src/data/kb.json
var kb_default = {
  OCCASIONS: [
    {
      id: "tet",
      name: "T\u1EBFt",
      short: "T\u1EBFt",
      formality: 60,
      sacred: false,
      hint_vi: "S\u1EAFc may m\u1EAFn, ch\u1EE5p \u1EA3nh gia \u0111\xECnh, ch\xFAc T\u1EBFt, du xu\xE2n."
    },
    {
      id: "ky-yeu",
      name: "Ch\u1EE5p k\u1EF7 y\u1EBFu",
      short: "K\u1EF7 y\u1EBFu",
      formality: 45,
      sacred: false,
      hint_vi: "L\xEAn \u1EA3nh \u0111\u1EB9p, ph\u1ED1i theo nh\xF3m b\u1EA1n, d\u1EC5 v\u1EADn \u0111\u1ED9ng."
    },
    {
      id: "cuoi-hoi",
      name: "C\u01B0\u1EDBi h\u1ECFi",
      short: "C\u01B0\u1EDBi h\u1ECFi",
      formality: 80,
      sacred: false,
      hint_vi: "Trang tr\u1ECDng, h\u1EE3p nghi l\u1EC5 gia \u0111\xECnh, m\xE0u t\u01B0\u01A1i s\xE1ng."
    },
    {
      id: "le-hoi-dinh-chua",
      name: "L\u1EC5 h\u1ED9i / \u0111\xECnh ch\xF9a",
      short: "\u0110\xECnh ch\xF9a",
      formality: 85,
      sacred: true,
      hint_vi: "K\xEDn \u0111\xE1o, t\xF4n nghi\xEAm, \u0111i l\u1EA1i tho\u1EA3i m\xE1i trong s\xE2n \u0111\xECnh."
    },
    {
      id: "dao-pho",
      name: "D\u1EA1o ph\u1ED1",
      short: "D\u1EA1o ph\u1ED1",
      formality: 20,
      sacred: false,
      hint_vi: "Tho\u1EA3i m\xE1i, c\xE1 t\xEDnh, ph\u1ED1i t\u1EF1 do v\u1EDBi \u0111\u1ED3 hi\u1EC7n \u0111\u1EA1i."
    },
    {
      id: "trung-thu",
      name: "Trung thu",
      short: "Trung thu",
      formality: 35,
      sacred: false,
      hint_vi: "Vui t\u01B0\u01A1i, h\u1EE3p \u0111\xE8n \xF4ng sao v\xE0 kh\xF4ng kh\xED h\u1ED9i tr\u0103ng."
    }
  ],
  REGIONS: [
    {
      id: "B\u1EAFc",
      name: "Mi\u1EC1n B\u1EAFc",
      sub: "Kinh B\u1EAFc, Th\u0103ng Long"
    },
    {
      id: "Trung",
      name: "Mi\u1EC1n Trung",
      sub: "Hu\u1EBF, Thu\u1EADn Ho\xE1"
    },
    {
      id: "Nam",
      name: "Mi\u1EC1n Nam",
      sub: "\u0110\u1ED3ng b\u1EB1ng Nam B\u1ED9"
    }
  ],
  GARMENTS: [
    {
      id: "ao-dai",
      name: "\xC1o d\xE0i",
      aliases: [
        "\xE1o d\xE0i t\xE2n th\u1EDDi",
        "\xE1o d\xE0i Lemur",
        "\xE1o d\xE0i Raglan"
      ],
      period: "T\u1EEB th\u1EADp ni\xEAn 1930 \u0111\u1EBFn nay",
      region: "all",
      gender: "c\u1EA3 hai",
      formality: 60,
      must_show: [
        "collar",
        "ta",
        "sleeves"
      ],
      levels: [
        1,
        2,
        3
      ],
      structure: {
        collar: "C\u1ED5 \u0111\u1EE9ng cao kho\u1EA3ng 2\u20133 cm (bi\u1EBFn th\u1EC3 c\u1ED5 thuy\u1EC1n, c\u1ED5 tr\xF2n \u1EDF \xE1o c\xE1ch t\xE2n)",
        closure: "Khuy b\u1EA5m ho\u1EB7c c\xFAc ch\u1EA1y ch\xE9o t\u1EEB c\u1ED5 sang n\xE1ch ph\u1EA3i r\u1ED3i xu\u1ED1ng s\u01B0\u1EDDn",
        sleeves: "Tay d\xE0i, h\u1EB9p, th\u01B0\u1EDDng may ki\u1EC3u raglan",
        hem: "Hai t\xE0 tr\u01B0\u1EDBc sau d\xE0i \u0111\u1EBFn b\u1EAFp ch\xE2n, x\u1EBB t\xE0 t\u1EEB eo",
        worn_with: [
          "Qu\u1EA7n \u1ED1ng r\u1ED9ng l\u1EE5a ho\u1EB7c satin",
          "Kh\u0103n v\u1EA5n (n\u1EEF) ho\u1EB7c kh\u0103n x\u1EBFp (nam)"
        ]
      },
      parts: [
        {
          key: "collar",
          x: 0.5,
          y: 0.26
        },
        {
          key: "closure",
          x: 0.47,
          y: 0.33
        },
        {
          key: "sleeves",
          x: 0.32,
          y: 0.44
        },
        {
          key: "hem",
          x: 0.5,
          y: 0.72
        },
        {
          key: "worn_with",
          x: 0.5,
          y: 0.88
        }
      ],
      timeline: [
        {
          year: "1934",
          title_vi: "\xC1o d\xE0i Lemur (C\xE1t T\u01B0\u1EDDng)",
          text_vi: "Ho\u1EA1 s\u0129 C\xE1t T\u01B0\u1EDDng c\u1EA3i c\xE1ch \xE1o ng\u0169 th\xE2n th\xE0nh \xE1o d\xE0i t\xE2n th\u1EDDi hai t\xE0 tr\xEAn b\xE1o Phong Ho\xE1. Phom \xE1o \xF4m s\xE1t ng\u1EF1c, c\u1ED5 b\u1EBB ho\u1EB7c vi\u1EC1n ren, v\u1EA1t d\xE0i ch\u1EA5m \u0111\u1EA5t.",
          source_ids: [
            "src:ngan-nam-ao-mu",
            "src:btls-tphcm"
          ]
        },
        {
          year: "1950",
          title_vi: "\xC1o d\xE0i c\u1ED5 cao truy\u1EC1n th\u1ED1ng",
          text_vi: "C\xE1c nh\xE0 may t\u1EA1i H\xE0 N\u1ED9i v\xE0 S\xE0i G\xF2n \u0111\u1ECBnh h\xECnh c\u1ED5 \u0111\u1EE9ng cao 2\u20133 cm k\xEDn \u0111\xE1o, gi\u1EEF nguy\xEAn hai t\xE0 bay. \xC1o tr\u1EDF th\xE0nh trang ph\u1EE5c n\u1EEF sinh v\xE0 c\xF4ng s\u1EDF thanh l\u1ECBch.",
          source_ids: [
            "src:btls-tphcm"
          ]
        },
        {
          year: "1960",
          title_vi: "C\u1EA3i ti\u1EBFn tay raglan (nh\xE0 may Dung)",
          text_vi: "Nh\xE0 may Dung \u1EDF \u0110a Kao (S\xE0i G\xF2n) s\xE1ng t\u1EA1o ki\u1EC3u r\xE1p tay raglan n\u1ED1i t\u1EEB c\u1ED5 ch\xE9o xu\u1ED1ng n\xE1ch. C\u1EA3i ti\u1EBFn n\xE0y gi\xFAp n\xE1ch \xE1o ph\u1EB3ng phiu, kh\xF4ng nh\u0103n nh\xFAm v\xE0 c\u1EED \u0111\u1ED9ng t\u1EF1 nhi\xEAn.",
          source_ids: [
            "src:btls-tphcm"
          ]
        },
        {
          year: "1989",
          title_vi: "Ph\u1EE5c h\u01B0ng v\xE0 \xE1o d\xE0i c\xE1ch t\xE2n",
          text_vi: "Cu\u1ED9c thi Hoa h\u1EADu \xC1o d\xE0i 1989 \u0111\xE1nh d\u1EA5u s\u1EF1 tr\u1EDF l\u1EA1i m\u1EA1nh m\u1EBD c\u1EE7a \xE1o d\xE0i trong \u0111\u1EDDi s\u1ED1ng \u0111\xF4 th\u1ECB. V\u1EC1 sau, \xE1o d\xE0i c\xE1ch t\xE2n ph\u1ED1i c\xF9ng qu\u1EA7n \xE2u, ch\xE2n v\xE1y ti\u1EBFp t\u1EE5c m\u1EDF r\u1ED9ng s\u1EE9c s\u1ED1ng di s\u1EA3n.",
          source_ids: [
            "src:btls-tphcm"
          ]
        }
      ],
      summary_vi: "\xC1o d\xE0i hai t\xE0 hi\u1EC7n \u0111\u1EA1i \u0111\u1ECBnh h\xECnh t\u1EEB th\u1EADp ni\xEAn 1930 (c\u1EA3i c\xE1ch c\u1EE7a ho\u1EA1 s\u0129 C\xE1t T\u01B0\u1EDDng) v\xE0 \xF4m d\xE1ng h\u01A1n v\xE0o th\u1EADp ni\xEAn 1960 v\u1EDBi tay raglan. L\xE0 trang ph\u1EE5c ph\u1ED5 bi\u1EBFn nh\u1EA5t cho l\u1EC5 T\u1EBFt, c\u01B0\u1EDBi h\u1ECFi, k\u1EF7 y\u1EBFu v\xE0 c\u1EA3 \u0111\u1EDDi s\u1ED1ng th\u01B0\u1EDDng ng\xE0y.",
      history_vi: "\xC1o d\xE0i t\xE2n th\u1EDDi k\u1EBF th\u1EEBa \xE1o ng\u0169 th\xE2n th\u1EDDi Nguy\u1EC5n nh\u01B0ng thu h\u1EB9p phom, gi\u1EA3m c\xF2n hai t\xE0. T\u1EEB th\u1EADp ni\xEAn 1930 tr\u1EDF \u0111i, \xE1o d\xE0i li\xEAn t\u1EE5c thay \u0111\u1ED5i theo th\u1EA9m m\u1EF9 t\u1EEBng th\u1EDDi k\u1EF3.",
      occasion_rules: {
        tet: {
          status: "ok",
          note_vi: "L\u1EF1a ch\u1ECDn kinh \u0111i\u1EC3n; \u01B0u ti\xEAn \u0111\u1ECF son, v\xE0ng ho\xE0ng y\u1EBFn."
        },
        "ky-yeu": {
          status: "ok",
          note_vi: "\xC1o d\xE0i tr\u1EAFng ho\u1EB7c pastel l\xE0 h\xECnh \u1EA3nh k\u1EF7 y\u1EBFu quen thu\u1ED9c."
        },
        "cuoi-hoi": {
          status: "ok",
          note_vi: "H\u1EE3p c\u1EA3 c\xF4 d\xE2u l\u1EABn kh\xE1ch m\u1EDDi; tr\xE1nh tr\u1EAFng n\u1EBFu b\u1EA1n l\xE0 kh\xE1ch."
        },
        "le-hoi-dinh-chua": {
          status: "ok",
          note_vi: "K\xEDn \u0111\xE1o, \u0111oan trang; ch\u1ECDn v\u1EA3i kh\xF4ng qu\xE1 m\u1ECFng."
        },
        "dao-pho": {
          status: "ok",
          note_vi: "\xC1o d\xE0i c\xE1ch t\xE2n v\u1EDBi qu\u1EA7n b\xF2 ho\u1EB7c ch\xE2n v\xE1y l\xE0 c\xE1ch ph\u1ED1i quen thu\u1ED9c."
        },
        "trung-thu": {
          status: "ok",
          note_vi: "H\u1EE3p m\xE0u t\u01B0\u01A1i v\xE0 ph\u1EE5 ki\u1EC7n \u0111\xE8n l\u1ED3ng."
        }
      },
      remix: {
        ok: [
          "quan-bo-ong-rong",
          "quan-tay",
          "chan-vay-xep-ly",
          "ao-len-cai-cuc",
          "giay-luoi",
          "bot-co-cao",
          "ao-vest",
          "giay-cao-co",
          "giay-bup-be",
          "ao-mang-to",
          "so-mi-oversize",
          "ao-co-lo",
          "that-lung-ban-to",
          "tui-deo-cheo"
        ],
        caution: [
          "ao-khoac-bo",
          "ao-ni-mu",
          "mu-luoi-trai",
          "mu-tai-beo",
          "ao-thun-trang",
          "ao-bomber",
          "ao-khoac-da",
          "ao-varsity",
          "quan-cargo",
          "giay-de-tho",
          "balo",
          "mu-len"
        ],
        conflict: [
          "ao-croptop"
        ]
      },
      colors_classic: [
        "do-son",
        "trang-nga",
        "tim-hue",
        "vang-hoang-yen",
        "hong-dao",
        "xanh-thien-thanh"
      ],
      dont_confuse_with: [
        {
          name: "S\u01B0\u1EDDn x\xE1m (Trung Qu\u1ED1c)",
          how_vi: "S\u01B0\u1EDDn x\xE1m \xF4m s\xE1t, kh\xF4ng m\u1EB7c v\u1EDBi qu\u1EA7n, x\u1EBB t\xE0 cao \u1EDF \u0111\xF9i; \xE1o d\xE0i lu\xF4n \u0111i v\u1EDBi qu\u1EA7n \u1ED1ng r\u1ED9ng v\xE0 x\u1EBB t\u1EEB eo."
        }
      ],
      sources: [
        "src:ngan-nam-ao-mu",
        "src:btls-tphcm"
      ],
      verified: false,
      contested_vi: [
        "Vai tr\xF2 ch\xEDnh x\xE1c c\u1EE7a C\xE1t T\u01B0\u1EDDng v\xE0 L\xEA Ph\u1ED5 trong c\u1EA3i c\xE1ch 1934\u20131935 v\u1EABn \u0111\u01B0\u1EE3c b\xE0n lu\u1EADn."
      ]
    },
    {
      id: "ao-ngu-than",
      name: "\xC1o ng\u0169 th\xE2n",
      aliases: [
        "\xE1o ng\u0169 th\xE2n tay ch\u1EBDn",
        "\xE1o d\xE0i ng\u0169 th\xE2n"
      ],
      period: "Th\u1EBF k\u1EF7 18 \u2013 \u0111\u1EA7u th\u1EBF k\u1EF7 20 (th\u1EDDi Nguy\u1EC5n)",
      region: "all",
      gender: "c\u1EA3 hai",
      formality: 65,
      must_show: [
        "collar",
        "closure",
        "hem"
      ],
      levels: [
        1,
        2,
        3
      ],
      structure: {
        collar: "C\u1ED5 \u0111\u1EE9ng (l\u1EADp l\u0129nh), b\xEAn trong th\u01B0\u1EDDng l\u1ED9 vi\u1EC1n c\u1ED5 \xE1o l\xF3t tr\u1EAFng",
        closure: "N\u0103m khuy c\xE0i t\u1EEB c\u1ED5, qua ng\u1EF1c sang n\xE1ch ph\u1EA3i r\u1ED3i xu\u1ED1ng s\u01B0\u1EDDn ph\u1EA3i",
        sleeves: "Tay ch\u1EBDn (h\u1EB9p, v\u1EEBa c\u1ED5 tay)",
        hem: "D\xE1ng su\xF4ng, h\u01A1i xo\xE8, d\xE0i qu\xE1 g\u1ED1i",
        worn_with: [
          "Qu\u1EA7n \u1ED1ng r\u1ED9ng m\xE0u tr\u1EAFng",
          "Kh\u0103n v\u1EA5n ho\u1EB7c kh\u0103n x\u1EBFp",
          "\xC1o l\xF3t tr\u1EAFng b\xEAn trong"
        ]
      },
      parts: [
        {
          key: "collar",
          x: 0.5,
          y: 0.26
        },
        {
          key: "closure",
          x: 0.46,
          y: 0.35
        },
        {
          key: "sleeves",
          x: 0.32,
          y: 0.45
        },
        {
          key: "hem",
          x: 0.5,
          y: 0.7
        },
        {
          key: "worn_with",
          x: 0.5,
          y: 0.88
        }
      ],
      timeline: [
        {
          year: "1744",
          title_vi: "C\u1EA3i c\xE1ch y ph\u1EE5c ch\xFAa Nguy\u1EC5n Ph\xFAc Kho\xE1t",
          text_vi: "Ch\xFAa Nguy\u1EC5n Ph\xFAc Kho\xE1t ban s\u1EAFc d\u1EE5 \u0111\u1ECBnh ch\u1EBF y ph\u1EE5c x\u1EE9 \u0110\xE0ng Trong, quy \u0111\u1ECBnh \xE1o ng\u0169 th\xE2n c\xE0i n\u0103m khuy v\xE0 m\u1EB7c c\xF9ng qu\u1EA7n hai \u1ED1ng. \u0110\xE2y l\xE0 m\u1ED1c m\u1EDF \u0111\u1EA7u cho phom d\xE1ng ti\u1EC1n th\xE2n c\u1EE7a \xE1o d\xE0i.",
          source_ids: [
            "src:ngan-nam-ao-mu"
          ]
        },
        {
          year: "1836",
          title_vi: "Th\u1ED1ng nh\u1EA5t y ph\u1EE5c tri\u1EC1u vua Minh M\u1EA1ng",
          text_vi: "Vua Minh M\u1EA1ng ban l\u1EC7nh th\u1ED1ng nh\u1EA5t trang ph\u1EE5c c\u1EA3 n\u01B0\u1EDBc theo l\u1ED1i \xE1o c\u1ED5 \u0111\u1EE9ng c\xE0i khuy v\xE0 qu\u1EA7n d\xE0i. \xC1o ng\u0169 th\xE2n tay ch\u1EBDn tr\u1EDF th\xE0nh qu\u1ED1c ph\u1EE5c ph\u1ED5 bi\u1EBFn t\u1EEB d\xE2n gian t\u1EDBi quan tr\u01B0\u1EDDng tri\u1EC1u Nguy\u1EC5n.",
          source_ids: [
            "src:ngan-nam-ao-mu"
          ]
        },
        {
          year: "\u0110\u1EA7u TK 20",
          title_vi: "Giao th\u1EDDi v\xE0 bi\u1EBFn th\u1EC3 th\u01B0\u1EDDng nh\u1EADt",
          text_vi: "\xC1o ng\u0169 th\xE2n \u0111i c\xF9ng kh\u0103n v\u1EA5n v\xE0 d\xF9 t\xE2y xu\u1EA5t hi\u1EC7n nhi\u1EC1u trong \u1EA3nh t\u01B0 li\u1EC7u H\xE0 N\u1ED9i, Hu\u1EBF, S\xE0i G\xF2n \u0111\u1EA7u th\u1EBF k\u1EF7 20. \xC1o may b\u1EB1ng l\u1EE5a, the, g\u1EA5m cho nhi\u1EC1u t\u1EA7ng l\u1EDBp x\xE3 h\u1ED9i.",
          source_ids: [
            "src:ngan-nam-ao-mu",
            "src:y-van-hien"
          ]
        },
        {
          year: "2020",
          title_vi: "Phong tr\xE0o ph\u1EE5c d\u1EF1ng trong gi\u1EDBi tr\u1EBB",
          text_vi: "Nhi\u1EC1u h\u1ED9i nh\xF3m v\u0103n ho\xE1 c\u1ED5 phong ph\u1EE5c d\u1EF1ng \xE1o ng\u0169 th\xE2n tay ch\u1EBDn cho nam v\xE0 n\u1EEF. Trang ph\u1EE5c \u0111\u01B0\u1EE3c \u0111\u01B0a tr\u1EDF l\u1EA1i c\xF4ng s\u1EDF, l\u1EC5 h\u1ED9i v\xE0 \u0111\u1EDDi s\u1ED1ng \u0111\u01B0\u01A1ng \u0111\u1EA1i.",
          source_ids: [
            "src:y-van-hien",
            "src:vietnam-centre"
          ]
        }
      ],
      summary_vi: "\xC1o may t\u1EEB n\u0103m th\xE2n v\u1EA3i: hai th\xE2n tr\u01B0\u1EDBc, hai th\xE2n sau v\xE0 m\u1ED9t th\xE2n con gi\u1EA5u b\xEAn trong v\u1EA1t ph\u1EA3i, c\u1ED5 \u0111\u1EE9ng, c\xE0i khuy b\xEAn ph\u1EA3i. D\xE1ng su\xF4ng, k\xEDn \u0111\xE1o, m\u1EB7c \u0111\u01B0\u1EE3c c\u1EA3 nam l\u1EABn n\u1EEF; l\xE0 ti\u1EC1n th\xE2n tr\u1EF1c ti\u1EBFp c\u1EE7a \xE1o d\xE0i hi\u1EC7n \u0111\u1EA1i.",
      history_vi: "\xC1o ng\u0169 th\xE2n ph\u1ED5 bi\u1EBFn r\u1ED9ng r\xE3i th\u1EDDi Nguy\u1EC5n v\xE0 th\u01B0\u1EDDng \u0111\u01B0\u1EE3c g\u1EAFn v\u1EDBi cu\u1ED9c c\u1EA3i c\xE1ch y ph\u1EE5c \u1EDF \u0110\xE0ng Trong d\u01B0\u1EDBi th\u1EDDi ch\xFAa Nguy\u1EC5n Ph\xFAc Kho\xE1t (1744). Phong tr\xE0o ph\u1EE5c d\u1EF1ng nh\u1EEFng n\u0103m g\u1EA7n \u0111\xE2y \u0111\u01B0a ng\u0169 th\xE2n tr\u1EDF l\u1EA1i \u0111\u1EDDi s\u1ED1ng tr\u1EBB.",
      occasion_rules: {
        tet: {
          status: "ok",
          note_vi: "R\u1EA5t h\u1EE3p; \u0111\u1ECF son, v\xE0ng ngh\u1EC7 ho\u1EB7c xanh ch\xE0m \u0111\u1EC1u \u0111\u1EB9p."
        },
        "ky-yeu": {
          status: "ok",
          note_vi: "L\xEAn \u1EA3nh nh\xF3m r\u1EA5t \u0111\u1EC1u; ph\u1ED1i gi\xE0y th\u1EC3 thao tr\u1EAFng \u0111\u1EC3 d\u1EC5 di chuy\u1EC3n."
        },
        "cuoi-hoi": {
          status: "ok",
          note_vi: "H\u1EE3p c\u1EA3 nh\xE0 trai l\u1EABn nh\xE0 g\xE1i, nh\u1EA5t l\xE0 b\u1EA3n tay ch\u1EBDn m\xE0u t\u01B0\u01A1i."
        },
        "le-hoi-dinh-chua": {
          status: "ok",
          note_vi: "K\xEDn \u0111\xE1o, \u0111\xFAng tinh th\u1EA7n l\u1EC5; n\xEAn \u0111i gu\u1ED1c m\u1ED9c ho\u1EB7c h\xE0i."
        },
        "dao-pho": {
          status: "ok",
          note_vi: "Ph\u1ED1i \xE1o kho\xE1c ho\u1EB7c gi\xE0y th\u1EC3 thao l\xE0 c\xE1ch tr\u1EBB ho\xE1 quen thu\u1ED9c."
        },
        "trung-thu": {
          status: "ok",
          note_vi: "Ch\u1ECDn m\xE0u t\u01B0\u01A1i, th\xEAm qu\u1EA1t gi\u1EA5y ho\u1EB7c \u0111\xE8n l\u1ED3ng."
        }
      },
      remix: {
        ok: [
          "quan-bo-ong-rong",
          "quan-tay",
          "giay-luoi",
          "bot-co-cao",
          "ao-len-cai-cuc",
          "ao-vest",
          "ao-khoac-bo",
          "ao-mang-to",
          "so-mi-oversize",
          "ao-co-lo",
          "giay-bup-be",
          "that-lung-ban-to"
        ],
        caution: [
          "ao-ni-mu",
          "mu-luoi-trai",
          "mu-tai-beo",
          "ao-thun-trang",
          "chan-vay-xep-ly",
          "ao-bomber",
          "ao-khoac-da",
          "ao-varsity",
          "giay-cao-co",
          "giay-de-tho",
          "tui-deo-cheo",
          "balo",
          "quan-ong-loe"
        ],
        conflict: [
          "ao-croptop"
        ]
      },
      colors_classic: [
        "do-son",
        "xanh-cham",
        "vang-nghe",
        "nau-song",
        "xanh-luc-ngoc",
        "tim-hue"
      ],
      dont_confuse_with: [
        {
          name: "\xC1o t\u1EA5c",
          how_vi: "\xC1o t\u1EA5c c\xF9ng k\u1EBFt c\u1EA5u n\u0103m th\xE2n nh\u01B0ng tay th\u1EE5ng r\u1ED9ng, d\xF9ng l\xE0m l\u1EC5 ph\u1EE5c."
        },
        {
          name: "Tr\u01B0\u1EDDng sam / s\u01B0\u1EDDn x\xE1m",
          how_vi: "S\u01B0\u1EDDn x\xE1m \xF4m s\xE1t, x\u1EBB t\xE0 cao; ng\u0169 th\xE2n su\xF4ng v\xE0 lu\xF4n m\u1EB7c v\u1EDBi qu\u1EA7n."
        }
      ],
      sources: [
        "src:ngan-nam-ao-mu",
        "src:y-van-hien",
        "src:vietnam-centre"
      ],
      verified: false,
      contested_vi: [
        "C\xE1ch gi\u1EA3i th\xEDch \u201Cn\u0103m th\xE2n t\u01B0\u1EE3ng tr\u01B0ng t\u1EE9 th\xE2n ph\u1EE5 m\u1EABu v\xE0 ng\u01B0\u1EDDi m\u1EB7c\u201D hay \u201Cn\u0103m khuy l\xE0 ng\u0169 th\u01B0\u1EDDng\u201D l\xE0 di\u1EC5n gi\u1EA3i d\xE2n gian, ch\u01B0a c\xF3 v\u0103n b\u1EA3n g\u1ED1c x\xE1c nh\u1EADn."
      ]
    },
    {
      id: "ao-tac",
      name: "\xC1o t\u1EA5c",
      aliases: [
        "\xE1o ng\u0169 th\xE2n tay th\u1EE5ng",
        "\xE1o l\u1EC5"
      ],
      period: "Th\u1EDDi Nguy\u1EC5n (th\u1EBF k\u1EF7 19 \u2013 \u0111\u1EA7u th\u1EBF k\u1EF7 20)",
      region: "all",
      gender: "c\u1EA3 hai",
      formality: 85,
      must_show: [
        "collar",
        "sleeves",
        "hem"
      ],
      levels: [
        1,
        2
      ],
      structure: {
        collar: "C\u1ED5 \u0111\u1EE9ng, m\u1EB7c ngo\xE0i \xE1o l\xF3t tr\u1EAFng",
        closure: "N\u0103m khuy c\xE0i b\xEAn ph\u1EA3i nh\u01B0 \xE1o ng\u0169 th\xE2n",
        sleeves: "Tay th\u1EE5ng r\u1ED9ng, d\xE0i qu\xE1 b\xE0n tay",
        hem: "D\xE0i, r\u1ED9ng h\u01A1n ng\u0169 th\xE2n tay ch\u1EBDn",
        worn_with: [
          "Qu\u1EA7n tr\u1EAFng \u1ED1ng r\u1ED9ng",
          "Kh\u0103n x\u1EBFp ho\u1EB7c kh\u0103n v\u1EA5n",
          "H\xE0i th\xEAu"
        ]
      },
      parts: [
        {
          key: "collar",
          x: 0.5,
          y: 0.26
        },
        {
          key: "closure",
          x: 0.46,
          y: 0.35
        },
        {
          key: "sleeves",
          x: 0.28,
          y: 0.46
        },
        {
          key: "hem",
          x: 0.5,
          y: 0.76
        },
        {
          key: "worn_with",
          x: 0.5,
          y: 0.88
        }
      ],
      timeline: [
        {
          year: "1802",
          title_vi: "Quy ch\u1EBF l\u1EC5 ph\u1EE5c th\u1EDDi Nguy\u1EC5n",
          text_vi: "Nh\xE0 Nguy\u1EC5n \u0111\u1ECBnh h\xECnh \xE1o t\u1EA5c (\xE1o ng\u0169 th\xE2n tay th\u1EE5ng) l\xE0m th\u01B0\u1EDDng l\u1EC5 ph\u1EE5c cho ho\xE0ng t\u1ED9c, quan vi\xEAn v\xE0 s\u0129 d\xE2n. \xC1o c\xF3 tay th\u1EE5ng r\u1ED9ng, d\xE0i qu\xE1 b\xE0n tay, mang t\xEDnh nghi l\u1EC5 trang nghi\xEAm.",
          source_ids: [
            "src:ngan-nam-ao-mu"
          ]
        },
        {
          year: "Cu\u1ED1i TK 19",
          title_vi: "Trang ph\u1EE5c c\u01B0\u1EDBi h\u1ECFi v\xE0 c\xFAng t\u1EBF",
          text_vi: "\xC1o t\u1EA5c tr\u1EDF th\xE0nh trang ph\u1EE5c b\u1EAFt bu\u1ED9c trong c\xE1c nghi l\u1EC5 gia ti\xEAn, c\xFAng b\xE1i v\xE0 h\xF4n l\u1EC5 kh\u1EAFp c\xE1c mi\u1EC1n. Ng\u01B0\u1EDDi m\u1EB7c lu\xF4n \u0111\u1ED9i kh\u0103n v\u1EA5n ho\u1EB7c kh\u0103n x\u1EBFp, \u0111i k\xE8m h\xE0i v\u1EA3i.",
          source_ids: [
            "src:ngan-nam-ao-mu",
            "src:y-van-hien"
          ]
        },
        {
          year: "Hi\u1EC7n nay",
          title_vi: "\xC1o t\u1EA5c trong ng\xE0y c\u01B0\u1EDBi \u0111\u01B0\u01A1ng \u0111\u1EA1i",
          text_vi: "\xC1o t\u1EA5c tr\u1EDF th\xE0nh l\u1EF1a ch\u1ECDn h\xE0ng \u0111\u1EA7u c\u1EE7a c\xF4 d\xE2u ch\xFA r\u1EC3 trong l\u1EC5 c\u01B0\u1EDBi truy\u1EC1n th\u1ED1ng Vi\u1EC7t Nam. C\xE1c d\u1EF1 \xE1n ph\u1EE5c d\u1EF1ng \u0111\u01B0a chu\u1EA9n may tay th\u1EE5ng v\xE0 n\u1EB9p c\u1ED5 \xE1o t\u1EA5c tr\u1EDF l\u1EA1i \u0111\xFAng quy chu\u1EA9n.",
          source_ids: [
            "src:vietnam-centre",
            "src:y-van-hien"
          ]
        }
      ],
      summary_vi: "\xC1o t\u1EA5c l\xE0 d\u1EA1ng l\u1EC5 ph\u1EE5c c\u1EE7a \xE1o ng\u0169 th\xE2n v\u1EDBi tay th\u1EE5ng r\u1ED9ng, d\xF9ng trong l\u1EC5 t\u1EBFt, c\u01B0\u1EDBi h\u1ECFi, c\xFAng gi\u1ED7 \u1EDF th\u1EDDi Nguy\u1EC5n. Ng\xE0y nay \u0111\u01B0\u1EE3c ph\u1EE5c d\u1EF1ng nhi\u1EC1u cho l\u1EC5 c\u01B0\u1EDBi v\xE0 ch\u1EE5p \u1EA3nh.",
      history_vi: "\xC1o t\u1EA5c \u0111\u01B0\u1EE3c m\u1EB7c r\u1ED9ng r\xE3i t\u1EEB th\u01B0\u1EDDng d\xE2n \u0111\u1EBFn quan l\u1EA1i trong c\xE1c d\u1ECBp l\u1EC5 nghi. T\xEAn g\u1ECDi \u201C\xE1o t\u1EA5c\u201D \u0111\u01B0\u1EE3c cho l\xE0 b\u1EAFt ngu\u1ED3n t\u1EEB chi\u1EC1u r\u1ED9ng vi\u1EC1n c\u1ED5 \xE1o kho\u1EA3ng m\u1ED9t t\u1EA5c.",
      occasion_rules: {
        tet: {
          status: "ok",
          note_vi: "\u0110\u1EB9p v\xE0 trang tr\u1ECDng cho ch\xFAc T\u1EBFt, ch\u1EE5p \u1EA3nh gia \u0111\xECnh."
        },
        "ky-yeu": {
          status: "ok",
          note_vi: "L\xEAn \u1EA3nh \u0111\u1EB9p; tay th\u1EE5ng h\u01A1i v\u01B0\u1EDBng khi ch\u1EA1y nh\u1EA3y."
        },
        "cuoi-hoi": {
          status: "ok",
          note_vi: "L\u1EC5 ph\u1EE5c kinh \u0111i\u1EC3n cho c\xF4 d\xE2u, ch\xFA r\u1EC3 v\xE0 h\u1ECD h\xE0ng."
        },
        "le-hoi-dinh-chua": {
          status: "ok",
          note_vi: "\u0110\xFAng tinh th\u1EA7n l\u1EC5 nghi."
        },
        "dao-pho": {
          status: "caution",
          note_vi: "L\xE0 l\u1EC5 ph\u1EE5c n\xEAn h\u01A1i trang tr\u1ECDng cho d\u1EA1o ph\u1ED1; n\u1EBFu v\u1EABn th\xEDch, g\u1EAFn nh\xE3n ph\u1ED1i giao thoa v\xE0 \u0111i gi\xE0y tho\u1EA3i m\xE1i."
        },
        "trung-thu": {
          status: "ok",
          note_vi: "H\u1EE3p ch\u1EE5p \u1EA3nh h\u1ED9i tr\u0103ng."
        }
      },
      remix: {
        ok: [
          "quan-tay",
          "giay-luoi",
          "bot-co-cao",
          "ao-co-lo"
        ],
        caution: [
          "quan-bo-ong-rong",
          "ao-vest",
          "ao-len-cai-cuc",
          "ao-khoac-bo",
          "ao-mang-to",
          "giay-bup-be"
        ],
        conflict: [
          "ao-ni-mu",
          "mu-tai-beo",
          "mu-luoi-trai",
          "ao-thun-trang",
          "ao-croptop",
          "quan-ong-loe",
          "quan-cargo",
          "tui-bao-tu",
          "tai-nghe"
        ]
      },
      colors_classic: [
        "do-son",
        "xanh-cham",
        "tim-hue",
        "vang-nghe",
        "xanh-luc-ngoc"
      ],
      dont_confuse_with: [
        {
          name: "\xC1o giao l\u0129nh",
          how_vi: "Giao l\u0129nh c\xF3 c\u1ED5 ch\xE9o, kh\xF4ng c\xE0i khuy; \xE1o t\u1EA5c c\u1ED5 \u0111\u1EE9ng, c\xE0i khuy b\xEAn ph\u1EA3i."
        }
      ],
      sources: [
        "src:ngan-nam-ao-mu",
        "src:vietnam-centre",
        "src:y-van-hien"
      ],
      verified: false,
      contested_vi: [
        "Ngu\u1ED3n g\u1ED1c t\xEAn g\u1ECDi \u201C\xE1o t\u1EA5c\u201D c\xF3 nhi\u1EC1u c\xE1ch gi\u1EA3i th\xEDch."
      ]
    },
    {
      id: "ao-tu-than",
      name: "\xC1o t\u1EE9 th\xE2n",
      aliases: [
        "\xE1o t\u1EE9 th\xE2n Kinh B\u1EAFc",
        "m\u1EDB ba m\u1EDB b\u1EA3y"
      ],
      period: "Th\u1EBF k\u1EF7 17 \u2013 \u0111\u1EA7u th\u1EBF k\u1EF7 20, B\u1EAFc B\u1ED9",
      region: [
        "B\u1EAFc"
      ],
      gender: "n\u1EEF",
      formality: 50,
      must_show: [
        "closure",
        "inner",
        "waist"
      ],
      levels: [
        1,
        2,
        3
      ],
      structure: {
        collar: "C\u1ED5 m\u1EDF, kh\xF4ng c\xE0i; hai v\u1EA1t tr\u01B0\u1EDBc bu\xF4ng",
        closure: "Kh\xF4ng khuy; hai v\u1EA1t tr\u01B0\u1EDBc c\xF3 th\u1EC3 bu\u1ED9c l\u1ECFng tr\u01B0\u1EDBc b\u1EE5ng",
        sleeves: "Tay d\xE0i, h\u1EB9p v\u1EEBa",
        hem: "D\xE0i \u0111\u1EBFn b\u1EAFp ch\xE2n; b\xEAn trong l\xE0 v\xE1y \u0111\u1EE5p \u0111en d\xE0i",
        worn_with: [
          "Y\u1EBFm",
          "V\xE1y \u0111\u1EE5p \u0111en",
          "Th\u1EAFt l\u01B0ng l\u1EE5a m\xE0u",
          "Kh\u0103n m\u1ECF qu\u1EA1",
          "N\xF3n quai thao"
        ]
      },
      parts: [
        {
          key: "collar",
          x: 0.5,
          y: 0.26
        },
        {
          key: "closure",
          x: 0.5,
          y: 0.46
        },
        {
          key: "sleeves",
          x: 0.32,
          y: 0.44
        },
        {
          key: "hem",
          x: 0.5,
          y: 0.68
        },
        {
          key: "worn_with",
          x: 0.5,
          y: 0.86
        }
      ],
      timeline: [
        {
          year: "Th\u1EBF k\u1EF7 17",
          title_vi: "Trang ph\u1EE5c th\xF4n qu\xEA B\u1EAFc B\u1ED9",
          text_vi: "\xC1o t\u1EE9 th\xE2n b\u1ED1n v\u1EA1t bu\xF4ng bay tr\u1EDF th\xE0nh y ph\u1EE5c lao \u0111\u1ED9ng v\xE0 h\u1ED9i h\xE8 c\u1EE7a ph\u1EE5 n\u1EEF v\xF9ng \u0111\u1ED3ng b\u1EB1ng s\xF4ng H\u1ED3ng. Hai th\xE2n sau kh\xE2u li\u1EC1n s\u1ED1ng l\u01B0ng, hai th\xE2n tr\u01B0\u1EDBc th\u1EA3 t\u1EF1 do thu\u1EADn ti\u1EC7n cho c\xF4ng vi\u1EC7c \u0111\u1ED3ng \xE1ng.",
          source_ids: [
            "src:ngan-nam-ao-mu",
            "src:bt-phu-nu-vn"
          ]
        },
        {
          year: "Th\u1EBF k\u1EF7 19",
          title_vi: "M\u1EDB ba m\u1EDB b\u1EA3y h\u1ED9i l\xE0ng",
          text_vi: "Trong h\u1ED9i xu\xE2n v\xE0 h\xE1t quan h\u1ECD, c\xE1c li\u1EC1n ch\u1ECB m\u1EB7c l\u1ED3ng nhi\u1EC1u l\u1EDBp \xE1o t\u1EE9 th\xE2n m\xE0u s\u1EAFc r\u1EF1c r\u1EE1 b\xEAn ngo\xE0i y\u1EBFm \u0111\xE0o. \u0110i k\xE8m l\xE0 n\xF3n quai thao v\xE0 th\u1EAFt l\u01B0ng l\u1EE5a m\xE0u bay b\u1ED5ng.",
          source_ids: [
            "src:bt-phu-nu-vn"
          ]
        },
        {
          year: "Th\u1EADp ni\xEAn 1930",
          title_vi: "Chuy\u1EC3n \u0111\u1ED5i sang \xE1o d\xE0i th\xE0nh th\u1ECB",
          text_vi: "T\u1EA1i c\xE1c \u0111\xF4 th\u1ECB l\u1EDBn, \xE1o t\u1EE9 th\xE2n d\u1EA7n nh\u01B0\u1EDDng ch\u1ED7 cho \xE1o d\xE0i t\xE2n th\u1EDDi g\u1ECDn g\xE0ng h\u01A1n. D\xF9 v\u1EADy, t\u1EE9 th\xE2n v\u1EABn \u0111\u01B0\u1EE3c g\xECn gi\u1EEF b\u1EC1n b\u1EC9 trong l\u1EC5 h\u1ED9i \u0111\xECnh ch\xF9a v\xE0 sinh ho\u1EA1t l\xE0ng qu\xEA B\u1EAFc B\u1ED9.",
          source_ids: [
            "src:bt-phu-nu-vn",
            "src:tu-dien"
          ]
        },
        {
          year: "Hi\u1EC7n nay",
          title_vi: "Di s\u1EA3n di\u1EC5n x\u01B0\u1EDBng v\xE0 bi\u1EC3u t\u01B0\u1EE3ng v\u0103n ho\xE1",
          text_vi: "\xC1o t\u1EE9 th\xE2n l\xE0 bi\u1EC3u t\u01B0\u1EE3ng th\u1ECB gi\xE1c c\u1EE7a d\xE2n ca quan h\u1ECD B\u1EAFc Ninh \u2014 di s\u1EA3n v\u0103n ho\xE1 phi v\u1EADt th\u1EC3 nh\xE2n lo\u1EA1i. Trang ph\u1EE5c th\u01B0\u1EDDng xuy\xEAn xu\u1EA5t hi\u1EC7n tr\xEAn c\xE1c s\xE2n kh\u1EA5u ngh\u1EC7 thu\u1EADt d\xE2n gian.",
          source_ids: [
            "src:bt-phu-nu-vn"
          ]
        }
      ],
      summary_vi: "\xC1o b\u1ED1n th\xE2n: hai th\xE2n sau kh\xE2u li\u1EC1n, hai th\xE2n tr\u01B0\u1EDBc bu\xF4ng t\u1EF1 do ho\u1EB7c bu\u1ED9c l\u1ECFng, m\u1EB7c ngo\xE0i y\u1EBFm v\xE0 v\xE1y \u0111en, th\u1EAFt l\u01B0ng l\u1EE5a m\xE0u. L\xE0 h\xECnh \u1EA3nh ti\xEAu bi\u1EC3u c\u1EE7a ph\u1EE5 n\u1EEF B\u1EAFc B\u1ED9 v\xE0 li\u1EC1n ch\u1ECB quan h\u1ECD.",
      history_vi: "\xC1o t\u1EE9 th\xE2n g\u1EAFn v\u1EDBi \u0111\u1EDDi s\u1ED1ng n\xF4ng th\xF4n B\u1EAFc B\u1ED9; \u1EDF h\u1ED9i h\xE8, ph\u1EE5 n\u1EEF m\u1EB7c l\u1ED3ng nhi\u1EC1u l\u1EDBp \xE1o m\xE0u (m\u1EDB ba m\u1EDB b\u1EA3y) c\xF9ng n\xF3n quai thao. \u0110\u1EA7u th\u1EBF k\u1EF7 20, \xE1o d\u1EA7n \u0111\u01B0\u1EE3c thay b\u1EB1ng \xE1o d\xE0i t\xE2n th\u1EDDi \u1EDF th\xE0nh th\u1ECB.",
      occasion_rules: {
        tet: {
          status: "ok",
          note_vi: "H\u1EE3p ch\u1EE5p \u1EA3nh xu\xE2n v\u1EDBi n\xF3n quai thao v\xE0 th\u1EAFt l\u01B0ng m\xE0u."
        },
        "ky-yeu": {
          status: "ok",
          note_vi: "\u0110\u1EB9p theo nh\xF3m; l\u01B0u \xFD v\xE1y \u0111\u1EE5p khi di chuy\u1EC3n."
        },
        "cuoi-hoi": {
          status: "ok",
          note_vi: "H\u1EE3p ch\u1EE5p \u1EA3nh c\u01B0\u1EDBi phong c\xE1ch d\xE2n gian; \xEDt d\xF9ng cho l\u1EC5 gia ti\xEAn hi\u1EC7n \u0111\u1EA1i."
        },
        "le-hoi-dinh-chua": {
          status: "ok",
          note_vi: "\u0110\xFAng ch\u1EA5t h\u1ED9i l\xE0ng; nh\u1EDB m\u1EB7c \u0111\u1EE7 \xE1o ngo\xE0i, kh\xF4ng m\u1EB7c y\u1EBFm tr\u1EA7n."
        },
        "dao-pho": {
          status: "ok",
          note_vi: "C\u1EA7n ph\u1ED1i kh\xE9o: \xE1o ngo\xE0i bu\u1ED9c v\u1EA1t c\xF9ng qu\u1EA7n b\xF2 l\xE0 h\u01B0\u1EDBng th\u1EED nghi\u1EC7m."
        },
        "trung-thu": {
          status: "ok",
          note_vi: "Vui t\u01B0\u01A1i, h\u1EE3p kh\xF4ng kh\xED h\u1ED9i."
        }
      },
      remix: {
        ok: [
          "quan-bo-ong-rong",
          "chan-vay-xep-ly",
          "bot-co-cao",
          "giay-luoi",
          "chan-vay-bo",
          "giay-bup-be",
          "mu-beret"
        ],
        caution: [
          "ao-khoac-bo",
          "ao-thun-trang",
          "mu-tai-beo",
          "quan-tay",
          "ao-len-cai-cuc",
          "so-mi-oversize",
          "giay-cao-co",
          "tui-deo-cheo"
        ],
        conflict: [
          "ao-vest",
          "ao-ni-mu",
          "mu-luoi-trai",
          "ao-croptop"
        ]
      },
      colors_classic: [
        "nau-song",
        "do-son",
        "vang-nghe",
        "xanh-luc-ngoc",
        "hong-dao"
      ],
      dont_confuse_with: [
        {
          name: "\xC1o ng\u0169 th\xE2n",
          how_vi: "Ng\u0169 th\xE2n c\xF3 c\u1ED5 \u0111\u1EE9ng c\xE0i khuy; t\u1EE9 th\xE2n c\u1ED5 m\u1EDF, v\u1EA1t bu\xF4ng, m\u1EB7c v\u1EDBi y\u1EBFm v\xE0 v\xE1y."
        }
      ],
      sources: [
        "src:bt-phu-nu-vn",
        "src:tu-dien",
        "src:ngan-nam-ao-mu"
      ],
      verified: false,
      contested_vi: [
        "Di\u1EC5n gi\u1EA3i \u201Cb\u1ED1n th\xE2n t\u01B0\u1EE3ng tr\u01B0ng t\u1EE9 th\xE2n ph\u1EE5 m\u1EABu\u201D l\xE0 c\xE1ch hi\u1EC3u d\xE2n gian."
      ]
    },
    {
      id: "ao-ba-ba",
      name: "\xC1o b\xE0 ba",
      aliases: [
        "\xE1o b\xE0 ba Nam B\u1ED9"
      ],
      period: "Cu\u1ED1i th\u1EBF k\u1EF7 19 \u0111\u1EBFn nay, Nam B\u1ED9",
      region: [
        "Nam"
      ],
      gender: "c\u1EA3 hai",
      formality: 35,
      must_show: [
        "collar",
        "closure",
        "hem"
      ],
      levels: [
        1,
        2,
        3
      ],
      structure: {
        collar: "Kh\xF4ng c\u1ED5; c\u1ED5 tr\xF2n ho\u1EB7c c\u1ED5 tim",
        closure: "C\xFAc c\xE0i th\u1EB3ng gi\u1EEFa th\xE2n tr\u01B0\u1EDBc",
        sleeves: "Tay d\xE0i, v\u1EEBa",
        hem: "Ngang h\xF4ng, x\u1EBB t\xE0 hai b\xEAn; hai t\xFAi \u1EDF v\u1EA1t tr\u01B0\u1EDBc",
        worn_with: [
          "Qu\u1EA7n \u0111en \u1ED1ng r\u1ED9ng",
          "Kh\u0103n r\u1EB1n",
          "N\xF3n l\xE1"
        ]
      },
      parts: [
        {
          key: "collar",
          x: 0.5,
          y: 0.27
        },
        {
          key: "closure",
          x: 0.5,
          y: 0.37
        },
        {
          key: "sleeves",
          x: 0.32,
          y: 0.43
        },
        {
          key: "hem",
          x: 0.5,
          y: 0.52
        },
        {
          key: "worn_with",
          x: 0.5,
          y: 0.86
        }
      ],
      timeline: [
        {
          year: "Cu\u1ED1i TK 19",
          title_vi: "Xu\u1EA5t hi\u1EC7n t\u1EA1i Nam B\u1ED9",
          text_vi: "\xC1o b\xE0 ba c\xE1nh ng\u1EAFn x\u1EBB t\xE0 hai b\xEAn h\xF4ng du nh\u1EADp v\xE0 ph\u1ED5 bi\u1EBFn nhanh ch\xF3ng t\u1EA1i \u0111\u1ED3ng b\u1EB1ng s\xF4ng C\u1EEDu Long. \xC1o nhu\u1ED9m m\xE0u n\xE2u ho\u1EB7c \u0111en b\u1EB1ng v\u1ECF c\xE2y c\xF3c, c\xE2y b\xE0ng \u0111\u1EC3 ti\u1EC7n lao \u0111\u1ED9ng s\xF4ng n\u01B0\u1EDBc.",
          source_ids: [
            "src:btls-tphcm",
            "src:tu-dien"
          ]
        },
        {
          year: "Th\u1EADp ni\xEAn 1950",
          title_vi: "C\u1EA3i ti\u1EBFn c\u1ED5 v\xE0 ch\xEDt eo",
          text_vi: "Ph\u1EE5 n\u1EEF th\xE0nh th\u1ECB Nam B\u1ED9 c\u1EA3i ti\u1EBFn \xE1o b\xE0 ba may ch\xEDt eo t\xF4n d\xE1ng, c\u1ED5 tim ho\u1EB7c c\u1ED5 l\xE1 sen, d\xF9ng v\u1EA3i hoa nhi\u1EC1u m\xE0u. \xC1o \u0111i c\xF9ng qu\u1EA7n l\u1EE5a \u0111en ho\u1EB7c tr\u1EAFng v\xE0 \u0111\xF4i gu\u1ED1c g\u1ED7.",
          source_ids: [
            "src:btls-tphcm"
          ]
        },
        {
          year: "Hi\u1EC7n nay",
          title_vi: "H\u1ED3n qu\xEA ph\u01B0\u01A1ng Nam",
          text_vi: "\xC1o b\xE0 ba c\xF9ng chi\u1EBFc kh\u0103n r\u1EB1n v\xE0 n\xF3n l\xE1 tr\u1EDF th\xE0nh bi\u1EC3u t\u01B0\u1EE3ng th\xE2n th\u01B0\u01A1ng c\u1EE7a v\u0103n ho\xE1 Nam B\u1ED9. Du kh\xE1ch kh\u1EAFp n\u01A1i t\xECm m\u1EB7c \xE1o b\xE0 ba khi gh\xE9 th\u0103m c\xE1c mi\u1EC7t v\u01B0\u1EDDn v\xE0 ch\u1EE3 n\u1ED5i.",
          source_ids: [
            "src:btls-tphcm"
          ]
        }
      ],
      summary_vi: "\xC1o c\xE1nh kh\xF4ng c\u1ED5, c\xE0i c\xFAc gi\u1EEFa, x\u1EBB t\xE0 h\xF4ng v\xE0 c\xF3 hai t\xFAi tr\u01B0\u1EDBc, m\u1EB7c v\u1EDBi qu\u1EA7n \u0111en \u1ED1ng r\u1ED9ng. Trang ph\u1EE5c lao \u0111\u1ED9ng v\xE0 th\u01B0\u1EDDng ng\xE0y quen thu\u1ED9c c\u1EE7a Nam B\u1ED9, m\u1ED9c m\u1EA1c v\xE0 m\xE1t.",
      history_vi: "\xC1o b\xE0 ba ph\u1ED5 bi\u1EBFn \u1EDF Nam B\u1ED9 t\u1EEB cu\u1ED1i th\u1EBF k\u1EF7 19; ngu\u1ED3n g\u1ED1c t\xEAn g\u1ECDi c\xF3 nhi\u1EC1u gi\u1EA3 thuy\u1EBFt. Ng\xE0y nay \xE1o b\xE0 ba xu\u1EA5t hi\u1EC7n nhi\u1EC1u trong du l\u1ECBch mi\u1EC7t v\u01B0\u1EDDn v\xE0 \u1EA3nh ch\u1EE3 n\u1ED5i.",
      occasion_rules: {
        tet: {
          status: "ok",
          note_vi: "H\u1EE3p T\u1EBFt mi\u1EC1n T\xE2y, nh\u1EA5t l\xE0 m\xE0u t\u01B0\u01A1i v\u1EDBi kh\u0103n r\u1EB1n."
        },
        "ky-yeu": {
          status: "ok",
          note_vi: "Ch\u1EE5p theo nh\xF3m \u1EDF b\u1ED1i c\u1EA3nh s\xF4ng n\u01B0\u1EDBc r\u1EA5t h\u1EE3p."
        },
        "cuoi-hoi": {
          status: "caution",
          note_vi: "L\xE0 trang ph\u1EE5c th\u01B0\u1EDDng ng\xE0y; cho l\u1EC5 gia ti\xEAn n\xEAn ch\u1ECDn \xE1o d\xE0i ho\u1EB7c \xE1o t\u1EA5c."
        },
        "le-hoi-dinh-chua": {
          status: "ok",
          note_vi: "K\xEDn \u0111\xE1o, nh\u1EB9 nh\xE0ng; ch\u1ECDn m\xE0u tr\u1EA7m."
        },
        "dao-pho": {
          status: "ok",
          note_vi: "R\u1EA5t h\u1EE3p d\u1EA1o ph\u1ED1, ph\u1ED1i gi\xE0y th\u1EC3 thao ho\u1EB7c gi\xE0y l\u01B0\u1EDDi."
        },
        "trung-thu": {
          status: "ok",
          note_vi: "Vui, d\u1EC5 v\u1EADn \u0111\u1ED9ng."
        }
      },
      remix: {
        ok: [
          "quan-bo-ong-rong",
          "quan-tay",
          "giay-luoi",
          "bot-co-cao",
          "ao-khoac-bo",
          "ao-len-cai-cuc",
          "mu-tai-beo",
          "chan-vay-bo",
          "quan-ong-loe",
          "quan-cargo",
          "giay-cao-co",
          "giay-de-tho",
          "ao-bomber",
          "tui-bao-tu",
          "tui-deo-cheo",
          "mu-len",
          "tai-nghe"
        ],
        caution: [
          "ao-vest",
          "chan-vay-xep-ly",
          "mu-luoi-trai",
          "ao-varsity",
          "ao-ni-mu",
          "balo"
        ],
        conflict: []
      },
      colors_classic: [
        "xanh-thien-thanh",
        "hong-dao",
        "nau-song",
        "xanh-cham",
        "vang-nghe",
        "den-tuyen"
      ],
      dont_confuse_with: [
        {
          name: "\xC1o c\xE1nh B\u1EAFc B\u1ED9",
          how_vi: "\xC1o c\xE1nh c\u0169ng ng\u1EAFn, c\xE0i c\xFAc gi\u1EEFa nh\u01B0ng th\u01B0\u1EDDng kh\xF4ng c\xF3 t\xFAi v\xE0 x\u1EBB t\xE0 ng\u1EAFn h\u01A1n."
        }
      ],
      sources: [
        "src:btls-tphcm",
        "src:tu-dien"
      ],
      verified: false,
      contested_vi: [
        "Ngu\u1ED3n g\u1ED1c t\xEAn g\u1ECDi \u201Cb\xE0 ba\u201D (t\u1EEB ng\u01B0\u1EDDi B\xE0-ba \u1EDF Penang hay c\xE1ch g\u1ECDi kh\xE1c) ch\u01B0a th\u1ED1ng nh\u1EA5t."
      ]
    },
    {
      id: "ao-nhat-binh",
      name: "\xC1o Nh\u1EADt B\xECnh",
      aliases: [
        "Nh\u1EADt B\xECnh",
        "\xE1o cung \u0111\xECnh Hu\u1EBF"
      ],
      period: "Tri\u1EC1u Nguy\u1EC5n (1802\u20131945)",
      region: [
        "Trung"
      ],
      gender: "n\u1EEF",
      formality: 95,
      must_show: [
        "collar",
        "sleeves",
        "hem"
      ],
      levels: [
        1,
        2
      ],
      structure: {
        collar: "Hai v\u1EA1t tr\u01B0\u1EDBc g\u1EB7p nhau t\u1EA1o c\u1ED5 \xE1o h\xECnh ch\u1EEF nh\u1EADt l\u1EDBn tr\u01B0\u1EDBc ng\u1EF1c (n\xEAn g\u1ECDi \u201CNh\u1EADt B\xECnh\u201D)",
        closure: "Bu\u1ED9c d\xE2y, kh\xF4ng c\xE0i khuy",
        sleeves: "Tay th\u1EE5ng r\u1ED9ng, c\u1EEDa tay c\xF3 d\u1EA3i ng\u0169 s\u1EAFc",
        hem: "D\xE0i \u0111\u1EBFn g\xF3t; m\u1EB7c ngo\xE0i \xE1o d\xE0i v\xE0 v\xE1y",
        worn_with: [
          "\xC1o d\xE0i l\xF3t",
          "V\xE1y ho\u1EB7c qu\u1EA7n",
          "Kh\u0103n v\xE0nh",
          "H\xE0i th\xEAu"
        ]
      },
      parts: [
        {
          key: "collar",
          x: 0.5,
          y: 0.26
        },
        {
          key: "closure",
          x: 0.5,
          y: 0.33
        },
        {
          key: "sleeves",
          x: 0.28,
          y: 0.46
        },
        {
          key: "hem",
          x: 0.5,
          y: 0.78
        },
        {
          key: "worn_with",
          x: 0.5,
          y: 0.88
        }
      ],
      timeline: [
        {
          year: "1807",
          title_vi: "\u0110\u1ECBnh ch\u1EBF ph\u1EA9m ph\u1EE5c tri\u1EC1u Gia Long",
          text_vi: "Nh\xE0 Nguy\u1EC5n quy \u0111\u1ECBnh \xE1o Nh\u1EADt B\xECnh l\xE0m th\u01B0\u1EDDng ph\u1EE5c cho ho\xE0ng h\u1EADu, c\xF4ng ch\xFAa v\xE0 th\u01B0\u1EDDng tri\u1EC1u ph\u1EE5c cho c\xE1c cung t\u1EA7n, m\u1EC7nh ph\u1EE5. \u0110i\u1EC3m \u0111\u1EB7c tr\u01B0ng l\xE0 c\u1ED5 \xE1o to b\u1EA3n th\xEAu hoa v\u0103n gh\xE9p th\xE0nh h\xECnh ch\u1EEF nh\u1EADt tr\u01B0\u1EDBc ng\u1EF1c.",
          source_ids: [
            "src:hoi-dien",
            "src:ngan-nam-ao-mu"
          ]
        },
        {
          year: "1836",
          title_vi: "Chu\u1EA9n ho\xE1 hoa v\u0103n theo ph\u1EA9m c\u1EA5p",
          text_vi: "\u0110\u1EA1i Nam h\u1ED9i \u0111i\u1EC3n s\u1EF1 l\u1EC7 quy \u0111\u1ECBnh chi ti\u1EBFt m\xE0u s\u1EAFc \xE1o Nh\u1EADt B\xECnh theo th\u1EE9 b\u1EADc: ho\xE0ng h\u1EADu d\xF9ng m\xE0u v\xE0ng ch\xEDnh s\u1EAFc ho\u1EB7c cam, c\xF4ng ch\xFAa m\xE0u \u0111\u1ECF, cung t\u1EA7n m\xE0u t\xEDm than v\xE0 l\u1EE5c. Tay \xE1o vi\u1EC1n d\u1EA3i ng\u0169 s\u1EAFc r\u1EF1c r\u1EE1.",
          source_ids: [
            "src:hoi-dien",
            "src:ngan-nam-ao-mu"
          ]
        },
        {
          year: "Sau 1945",
          title_vi: "T\u1EEB ch\u1ED1n cung c\u1EA5m ra \u0111\u1EDDi s\u1ED1ng",
          text_vi: "Sau khi tri\u1EC1u Nguy\u1EC5n tho\xE1i v\u1ECB, \xE1o Nh\u1EADt B\xECnh \u0111\u01B0\u1EE3c c\xE1c gia \u0111\xECnh qu\xFD t\u1ED9c x\u1EE9 Hu\u1EBF gi\u1EEF g\xECn l\xE0m \xE1o c\u01B0\u1EDBi truy\u1EC1n th\u1ED1ng. Hi\u1EC7n v\u1EADt l\u01B0u gi\u1EEF t\u1EA1i B\u1EA3o t\xE0ng C\u1ED5 v\u1EADt Cung \u0111\xECnh Hu\u1EBF l\xE0 ngu\u1ED3n t\u01B0 li\u1EC7u qu\xFD b\xE1u.",
          source_ids: [
            "src:ngan-nam-ao-mu",
            "src:y-van-hien"
          ]
        },
        {
          year: "2018",
          title_vi: "Ph\u1EE5c h\u01B0ng trang ph\u1EE5c cung \u0111\xECnh",
          text_vi: "C\xE1c d\u1EF1 \xE1n c\u1ED5 phong t\xE1i hi\u1EC7n quy chu\u1EA9n th\xEAu tay hoa v\u0103n c\xFAc m\u1EABu \u0111\u01A1n v\xE0 loan ph\u01B0\u1EE3ng tr\xEAn \xE1o Nh\u1EADt B\xECnh. Trang ph\u1EE5c nhanh ch\xF3ng tr\u1EDF th\xE0nh hi\u1EC7n t\u01B0\u1EE3ng trong gi\u1EDBi tr\u1EBB khi ch\u1EE5p \u1EA3nh c\u01B0\u1EDBi v\xE0 k\u1EF7 y\u1EBFu.",
          source_ids: [
            "src:y-van-hien"
          ]
        }
      ],
      summary_vi: "L\u1EC5 ph\u1EE5c c\u1EE7a n\u1EEF gi\u1EDBi ho\xE0ng t\u1ED9c v\xE0 m\u1EC7nh ph\u1EE5 tri\u1EC1u Nguy\u1EC5n, nh\u1EADn ra ngay nh\u1EDD vi\u1EC1n c\u1ED5 h\xECnh ch\u1EEF nh\u1EADt th\xEAu hoa v\u0103n v\xE0 d\u1EA3i ng\u0169 s\u1EAFc \u1EDF c\u1EEDa tay. Nay \u0111\u01B0\u1EE3c \u01B0a chu\u1ED9ng trong l\u1EC5 c\u01B0\u1EDBi v\xE0 ch\u1EE5p \u1EA3nh.",
      history_vi: "Nh\u1EADt B\xECnh \u0111\u01B0\u1EE3c quy \u0111\u1ECBnh trong \u0111i\u1EC3n ch\u1EBF tri\u1EC1u Nguy\u1EC5n, ph\xE2n c\u1EA5p theo m\xE0u s\u1EAFc v\xE0 hoa v\u0103n cho t\u1EEBng ph\u1EA9m b\u1EADc. T\u1EEB sau 1945, \xE1o tr\u1EDF th\xE0nh di s\u1EA3n tr\u01B0ng b\xE0y v\xE0 \u0111\u01B0\u1EE3c ph\u1EE5c d\u1EF1ng l\u1EA1i trong hai th\u1EADp ni\xEAn g\u1EA7n \u0111\xE2y.",
      occasion_rules: {
        tet: {
          status: "ok",
          note_vi: "H\u1EE3p ch\u1EE5p \u1EA3nh T\u1EBFt trang tr\u1ECDng."
        },
        "ky-yeu": {
          status: "ok",
          note_vi: "L\xEAn \u1EA3nh r\u1EA5t n\u1ED5i b\u1EADt; tay th\u1EE5ng c\u1EA7n b\u1ED1i c\u1EA3nh r\u1ED9ng."
        },
        "cuoi-hoi": {
          status: "ok",
          note_vi: "L\u1EF1a ch\u1ECDn quen thu\u1ED9c cho c\xF4 d\xE2u trong l\u1EC5 c\u01B0\u1EDBi truy\u1EC1n th\u1ED1ng."
        },
        "le-hoi-dinh-chua": {
          status: "ok",
          note_vi: "Trang tr\u1ECDng; ph\xF9 h\u1EE3p l\u1EC5 l\u1EDBn h\u01A1n l\xE0 \u0111i l\u1EC5 th\u01B0\u1EDDng."
        },
        "dao-pho": {
          status: "caution",
          note_vi: "L\xE0 l\u1EC5 ph\u1EE5c cung \u0111\xECnh; m\u1EB7c d\u1EA1o ph\u1ED1 n\xEAn g\u1ECDi r\xF5 l\xE0 ph\u1ED1i giao thoa, tr\xE1nh \u0111i c\xF9ng ph\u1EE5 ki\u1EC7n qu\xE1 xu\u1EC1 xo\xE0."
        },
        "trung-thu": {
          status: "ok",
          note_vi: "H\u1EE3p s\xE2n kh\u1EA5u, ch\u1EE5p \u1EA3nh."
        }
      },
      remix: {
        ok: [
          "quan-tay",
          "giay-luoi"
        ],
        caution: [
          "bot-co-cao",
          "chan-vay-xep-ly",
          "ao-vest",
          "mu-luoi-trai",
          "mu-tai-beo",
          "ao-co-lo",
          "giay-bup-be"
        ],
        conflict: [
          "ao-ni-mu",
          "ao-thun-trang",
          "ao-khoac-bo",
          "quan-bo-ong-rong",
          "ao-bomber",
          "ao-varsity",
          "ao-khoac-da",
          "ao-mang-to",
          "so-mi-oversize",
          "ao-croptop",
          "quan-cargo",
          "quan-ong-loe",
          "chan-vay-bo",
          "giay-cao-co",
          "giay-de-tho",
          "mu-len",
          "tai-nghe",
          "tui-bao-tu",
          "tui-deo-cheo",
          "balo",
          "that-lung-ban-to"
        ]
      },
      colors_classic: [
        "do-son",
        "tim-hue",
        "vang-hoang-yen",
        "xanh-luc-ngoc",
        "xanh-cham"
      ],
      dont_confuse_with: [
        {
          name: "\xC1o giao l\u0129nh",
          how_vi: "Giao l\u0129nh c\u1ED5 ch\xE9o ch\u1EEF y; Nh\u1EADt B\xECnh c\u1ED5 vu\xF4ng ch\u1EEF nh\u1EADt tr\u01B0\u1EDBc ng\u1EF1c."
        }
      ],
      sources: [
        "src:hoi-dien",
        "src:ngan-nam-ao-mu",
        "src:y-van-hien"
      ],
      verified: false,
      contested_vi: [
        "C\xE1c m\xF4 t\u1EA3 \u201CNh\u1EADt B\xECnh l\xE0 th\u01B0\u1EDDng ph\u1EE5c\u201D c\u1EA7n hi\u1EC3u theo ngh\u0129a \u0111i\u1EC3n ch\u1EBF (th\u01B0\u1EDDng ph\u1EE5c c\u1EE7a h\u1EADu phi so v\u1EDBi \u0111\u1EA1i tri\u1EC1u ph\u1EE5c), kh\xF4ng ph\u1EA3i \u0111\u1ED3 m\u1EB7c h\u1EB1ng ng\xE0y."
      ]
    },
    {
      id: "ao-giao-linh",
      name: "\xC1o giao l\u0129nh",
      aliases: [
        "\xE1o c\u1ED5 ch\xE9o",
        "giao l\u0129nh"
      ],
      period: "Th\u1EDDi L\xFD \u2013 Tr\u1EA7n \u2013 L\xEA (th\u1EBF k\u1EF7 11\u201318)",
      region: "all",
      gender: "c\u1EA3 hai",
      formality: 75,
      must_show: [
        "collar",
        "waist",
        "sleeves"
      ],
      levels: [
        1,
        2
      ],
      structure: {
        collar: "C\u1ED5 ch\xE9o: v\u1EA1t tr\xE1i \u0111\xE8 l\xEAn v\u1EA1t ph\u1EA3i t\u1EA1o h\xECnh ch\u1EEF y tr\u01B0\u1EDBc ng\u1EF1c",
        closure: "Kh\xF4ng khuy; gi\u1EEF b\u1EB1ng th\u1EAFt l\u01B0ng v\u1EA3i",
        sleeves: "Tay th\u1EE5ng r\u1ED9ng",
        hem: "D\xE0i \u0111\u1EBFn g\xF3t, m\u1EB7c ngo\xE0i v\xE1y ho\u1EB7c qu\u1EA7n",
        worn_with: [
          "Th\u1EAFt l\u01B0ng v\u1EA3i",
          "V\xE1y d\xE0i (th\u01B0\u1EDDng)",
          "\xC1o l\xF3t c\u1ED5 ch\xE9o",
          "H\xE0i"
        ]
      },
      parts: [
        {
          key: "collar",
          x: 0.5,
          y: 0.26
        },
        {
          key: "closure",
          x: 0.48,
          y: 0.34
        },
        {
          key: "sleeves",
          x: 0.28,
          y: 0.46
        },
        {
          key: "hem",
          x: 0.5,
          y: 0.78
        },
        {
          key: "worn_with",
          x: 0.5,
          y: 0.88
        }
      ],
      timeline: [
        {
          year: "Th\u1EBF k\u1EF7 11",
          title_vi: "Trang ph\u1EE5c th\u1EDDi L\xFD \u2013 Tr\u1EA7n",
          text_vi: "\xC1o c\u1ED5 ch\xE9o (giao l\u0129nh) l\xE0 d\u1EA1ng y ph\u1EE5c c\u0103n b\u1EA3n c\u1EE7a ng\u01B0\u1EDDi Vi\u1EC7t qua c\xE1c tri\u1EC1u \u0111\u1EA1i L\xFD, Tr\u1EA7n, th\u1EC3 hi\u1EC7n r\xF5 tr\xEAn c\xE1c t\u01B0\u1EE3ng \u0111\xE1 v\xE0 tranh v\u1EBD c\u1ED5. \xC1o d\xE0i v\u1EA1t \u0111\xE8 ch\xE9o tr\u01B0\u1EDBc ng\u1EF1c, bu\u1ED9c d\xE2y ngang h\xF4ng.",
          source_ids: [
            "src:ngan-nam-ao-mu"
          ]
        },
        {
          year: "Th\u1EBF k\u1EF7 15",
          title_vi: "\u0110i\u1EC3n ch\u1EBF tri\u1EC1u L\xEA s\u01A1",
          text_vi: "Tri\u1EC1u vua L\xEA Th\xE1nh T\xF4ng ban b\u1ED1 quy \u0111\u1ECBnh c\u1EE5 th\u1EC3 v\u1EC1 k\xEDch th\u01B0\u1EDBc, m\xE0u s\u1EAFc v\xE0 tay \xE1o giao l\u0129nh cho s\u0129 th\u1EE9. \xC1o th\u01B0\u1EDDng m\u1EB7c ngo\xE0i v\xE1y qu\xE2y ho\u1EB7c qu\u1EA7n l\u1EE5a, tay th\u1EE5ng r\u1ED9ng r\xE3i phong th\xE1i nho nh\xE3.",
          source_ids: [
            "src:ngan-nam-ao-mu"
          ]
        },
        {
          year: "Th\u1EBF k\u1EF7 18",
          title_vi: "Chuy\u1EC3n giao sang th\u1EDDi Nguy\u1EC5n",
          text_vi: "Sang th\u1EBF k\u1EF7 18\u201319, sau c\xE1c cu\u1ED9c c\u1EA3i c\xE1ch y ph\u1EE5c c\u1EE7a ch\xFAa Nguy\u1EC5n v\xE0 vua Minh M\u1EA1ng, \xE1o c\u1ED5 ch\xE9o d\u1EA7n thu h\u1EB9p ph\u1EA1m vi v\xE0 nh\u01B0\u1EDDng ch\u1ED7 cho \xE1o c\u1ED5 \u0111\u1EE9ng n\u0103m th\xE2n. Giao l\u0129nh ch\u1EC9 c\xF2n gi\u1EEF l\u1EA1i trong \u0111\u1EA1o ph\u1EE5c v\xE0 trang ph\u1EE5c t\u1EBF t\u1EF1.",
          source_ids: [
            "src:ngan-nam-ao-mu"
          ]
        },
        {
          year: "Hi\u1EC7n nay",
          title_vi: "Ph\u1EE5c d\u1EF1ng c\u1ED5 phong",
          text_vi: "D\u1EF1 \xE1n \u201CD\u1EC7t n\xEAn tri\u1EC1u \u0111\u1EA1i\u201D v\xE0 c\xE1c nh\xF3m ph\u1EE5c d\u1EF1ng t\xE1i hi\u1EC7n th\xE0nh c\xF4ng \xE1o giao l\u0129nh th\u1EDDi L\xEA s\u01A1. Trang ph\u1EE5c mang l\u1EA1i g\xF3c nh\xECn ch\xE2n th\u1EF1c v\u1EC1 b\u1EC1 d\xE0y l\u1ECBch s\u1EED ng\xE0n n\u0103m \xE1o m\u0169 \u0110\u1EA1i Vi\u1EC7t.",
          source_ids: [
            "src:vietnam-centre"
          ]
        }
      ],
      summary_vi: "\xC1o c\u1ED5 ch\xE9o ph\u1ED5 bi\u1EBFn su\u1ED1t th\u1EDDi L\xFD, Tr\u1EA7n, L\xEA: hai v\u1EA1t tr\u01B0\u1EDBc v\u1EAFt ch\xE9o, bu\u1ED9c b\u1EB1ng th\u1EAFt l\u01B0ng, tay r\u1ED9ng. L\xE0 ki\u1EC3u \xE1o n\u1EC1n c\u1EE7a nhi\u1EC1u trang ph\u1EE5c \u0110\xF4ng \xC1 nh\u01B0ng mang t\u1EC9 l\u1EC7, hoa v\u0103n v\xE0 c\xE1ch ph\u1ED1i ri\xEAng c\u1EE7a \u0110\u1EA1i Vi\u1EC7t.",
      history_vi: "Giao l\u0129nh xu\u1EA5t hi\u1EC7n tr\xEAn t\u01B0\u1EE3ng, tranh th\u1EDDi L\xFD \u2013 Tr\u1EA7n v\xE0 trong quy \u0111\u1ECBnh tri\u1EC1u L\xEA. Sang th\u1EDDi Nguy\u1EC5n, \xE1o c\u1ED5 ch\xE9o d\u1EA7n nh\u01B0\u1EDDng ch\u1ED7 cho \xE1o c\u1ED5 \u0111\u1EE9ng c\xE0i khuy.",
      occasion_rules: {
        tet: {
          status: "ok",
          note_vi: "\u0110\u1EB9p khi ch\u1EE5p \u1EA3nh xu\xE2n theo phong c\xE1ch c\u1ED5."
        },
        "ky-yeu": {
          status: "ok",
          note_vi: "N\u1ED5i b\u1EADt, n\xEAn ch\u1ECDn b\u1ED1i c\u1EA3nh di t\xEDch."
        },
        "cuoi-hoi": {
          status: "ok",
          note_vi: "H\u1EE3p l\u1EC5 c\u01B0\u1EDBi ph\u1EE5c d\u1EF1ng phong c\xE1ch L\xEA."
        },
        "le-hoi-dinh-chua": {
          status: "ok",
          note_vi: "R\u1EA5t h\u1EE3p l\u1EC5 h\u1ED9i truy\u1EC1n th\u1ED1ng."
        },
        "dao-pho": {
          status: "caution",
          note_vi: "Tay th\u1EE5ng v\xE0 v\u1EA1t d\xE0i v\u01B0\u1EDBng khi \u0111i ph\u1ED1; n\u1EBFu ph\u1ED1i hi\u1EC7n \u0111\u1EA1i nhi\u1EC1u, g\u1EAFn nh\xE3n giao thoa."
        },
        "trung-thu": {
          status: "ok",
          note_vi: "H\u1EE3p di\u1EC5n t\xEDch, r\u01B0\u1EDBc \u0111\xE8n."
        }
      },
      remix: {
        ok: [
          "quan-tay",
          "giay-luoi",
          "bot-co-cao",
          "that-lung-ban-to"
        ],
        caution: [
          "quan-bo-ong-rong",
          "ao-vest",
          "chan-vay-xep-ly",
          "ao-co-lo",
          "giay-bup-be"
        ],
        conflict: [
          "ao-ni-mu",
          "mu-tai-beo",
          "mu-luoi-trai",
          "ao-thun-trang",
          "ao-khoac-bo",
          "ao-len-cai-cuc",
          "ao-bomber",
          "ao-varsity",
          "ao-khoac-da",
          "ao-mang-to",
          "so-mi-oversize",
          "ao-croptop",
          "quan-cargo",
          "quan-ong-loe",
          "giay-de-tho",
          "tui-bao-tu"
        ]
      },
      colors_classic: [
        "xanh-luc-ngoc",
        "do-son",
        "vang-nghe",
        "xanh-cham",
        "trang-nga"
      ],
      dont_confuse_with: [
        {
          name: "H\xE1n ph\u1EE5c / kimono",
          how_vi: "C\xF9ng l\xE0 \xE1o c\u1ED5 ch\xE9o nh\u01B0ng kh\xE1c t\u1EC9 l\u1EC7, ch\u1EA5t li\u1EC7u, hoa v\u0103n v\xE0 ph\u1EE5 ki\u1EC7n; kh\xF4ng d\xF9ng ph\u1EE5 ki\u1EC7n c\u1EE7a trang ph\u1EE5c kh\xE1c r\u1ED3i g\u1ECDi l\xE0 Vi\u1EC7t ph\u1EE5c."
        }
      ],
      sources: [
        "src:ngan-nam-ao-mu",
        "src:vietnam-centre"
      ],
      verified: false,
      contested_vi: [
        "Chi ti\u1EBFt hoa v\u0103n v\xE0 m\xE0u s\u1EAFc t\u1EEBng th\u1EDDi k\u1EF3 d\u1EF1a ph\u1EA7n l\u1EDBn tr\xEAn t\u01B0\u1EE3ng, tranh n\xEAn c\xF2n nhi\u1EC1u ph\u1ECFng \u0111o\xE1n."
      ]
    },
    {
      id: "ao-the",
      name: "\xC1o the",
      aliases: [
        "\xE1o the hoa",
        "\xE1o the \u0111en",
        "\xE1o ng\u0169 th\xE2n the"
      ],
      period: "Th\u1EDDi Nguy\u1EC5n \u0111\u1EBFn \u0111\u1EA7u th\u1EBF k\u1EF7 20",
      region: "all",
      gender: "nam",
      formality: 75,
      must_show: [
        "collar",
        "closure",
        "inner"
      ],
      levels: [
        1,
        2
      ],
      structure: {
        collar: "C\u1ED5 \u0111\u1EE9ng (l\u1EADp l\u0129nh), l\xF3t b\xEAn trong \xE1o tr\u1EAFng",
        closure: "N\u0103m khuy c\xE0i b\xEAn s\u01B0\u1EDDn ph\u1EA3i",
        sleeves: "Tay ch\u1EBDn ho\u1EB7c h\u01A1i r\u1ED9ng",
        hem: "D\xE1ng su\xF4ng d\xE0i qu\xE1 g\u1ED1i, may b\u1EB1ng v\u1EA3i the/sa d\u1EC7t th\u01B0a th\u1EA5u quang",
        worn_with: [
          "Qu\u1EA7n l\u1EE5a tr\u1EAFng",
          "\xC1o l\xF3t tr\u1EAFng",
          "Kh\u0103n x\u1EBFp"
        ]
      },
      parts: [
        {
          key: "collar",
          x: 0.5,
          y: 0.26
        },
        {
          key: "closure",
          x: 0.46,
          y: 0.35
        },
        {
          key: "sleeves",
          x: 0.32,
          y: 0.45
        },
        {
          key: "hem",
          x: 0.5,
          y: 0.7
        },
        {
          key: "worn_with",
          x: 0.5,
          y: 0.88
        }
      ],
      timeline: [
        {
          year: "Th\u1EBF k\u1EF7 19",
          title_vi: "Y ph\u1EE5c tao nh\xE3 th\u1EDDi Nguy\u1EC5n",
          text_vi: "\xC1o the nam may theo k\u1EBFt c\u1EA5u ng\u0169 th\xE2n b\u1EB1ng ch\u1EA5t li\u1EC7u the ho\u1EB7c sa d\u1EC7t th\u01B0a, m\u1ECFng nh\u1EB9. \xC1o \u0111en kho\xE1c ngo\xE0i l\u1EDBp \xE1o l\xF3t tr\u1EAFng t\u1EA1o n\xEAn hi\u1EC7u \u1EE9ng th\u1ECB gi\xE1c t\u1EA7ng l\u1EDBp m\u1EF1c th\u01B0\u1EDBc c\u1EE7a b\u1EADc v\u0103n nh\xE2n.",
          source_ids: [
            "src:ngan-nam-ao-mu"
          ]
        },
        {
          year: "Th\u1EADp ni\xEAn 1920",
          title_vi: "H\xECnh b\xF3ng ph\u1ED1 c\u1ED5 H\xE0 N\u1ED9i",
          text_vi: "C\xE1c t\xFAc nho, quan vi\xEAn v\xE0 nh\xE2n s\u0129 B\u1EAFc K\u1EF3 m\u1EB7c \xE1o the \u0111en c\xF9ng kh\u0103n x\u1EBFp g\u1ECDn gh\u1EBD khi ra ph\u1ED1 ho\u1EB7c ti\u1EBFp kh\xE1ch qu\xFD. H\xECnh \u1EA3nh n\xE0y xu\u1EA5t hi\u1EC7n nhi\u1EC1u tr\xEAn c\xE1c b\u01B0u thi\u1EBFp v\xE0 \u1EA3nh t\u01B0 li\u1EC7u \u0111\u1EA7u th\u1EBF k\u1EF7 20.",
          source_ids: [
            "src:ngan-nam-ao-mu",
            "src:btls-tphcm"
          ]
        },
        {
          year: "Hi\u1EC7n nay",
          title_vi: "L\u1EC5 nghi \u0111\xECnh l\xE0ng v\xE0 di s\u1EA3n v\u0103n ho\xE1",
          text_vi: "\xC1o the kh\u0103n x\u1EBFp ti\u1EBFp t\u1EE5c \u0111\u01B0\u1EE3c c\xE1c b\xF4 l\xE3o v\xE0 nam gi\u1EDBi m\u1EB7c trong c\xE1c d\u1ECBp t\u1EBF l\u1EC5 th\xE0nh ho\xE0ng, vi\u1EC7c h\u1ECD v\xE0 m\u1EEBng th\u1ECD. Trang ph\u1EE5c \u0111\u01B0\u1EE3c ph\u1EE5c d\u1EF1ng r\u1ED9ng r\xE3i trong c\xE1c nghi l\u1EC5 trang tr\u1ECDng ng\xE0y nay.",
          source_ids: [
            "src:btls-tphcm"
          ]
        }
      ],
      summary_vi: "\xC1o ng\u0169 th\xE2n may b\u1EB1ng ch\u1EA5t li\u1EC7u the ho\u1EB7c sa \u0111en m\u1ECFng nh\u1EB9, m\u1EB7c ngo\xE0i \xE1o l\xF3t tr\u1EAFng t\u1EA1o hi\u1EC7u \u1EE9ng m\u1EDD \u1EA3o trang nh\xE3; l\xE0 l\u1EC5 ph\u1EE5c v\xE0 th\u01B0\u1EDDng ph\u1EE5c trang tr\u1ECDng c\u1EE7a nam gi\u1EDBi th\u1EDDi Nguy\u1EC5n v\xE0 \u0111\u1EA7u th\u1EBF k\u1EF7 20.",
      history_vi: "\xC1o the l\xE0 bi\u1EBFn th\u1EC3 c\u1EE7a \xE1o ng\u0169 th\xE2n nam th\u1EDDi Nguy\u1EC5n, may b\u1EB1ng v\u1EA3i the m\u1ECFng nhu\u1ED9m \u0111en. \u0110i c\xF9ng kh\u0103n x\u1EBFp v\xE0 qu\u1EA7n tr\u1EAFng, \xE1o the l\xE0 h\xECnh \u1EA3nh quen thu\u1ED9c c\u1EE7a c\xE1c b\u1EADc t\xFAc nho, quan l\u1EA1i v\xE0 nam gi\u1EDBi B\u1EAFc B\u1ED9 trong c\xE1c d\u1ECBp h\u1ED9i h\xE8, l\u1EC5 T\u1EBFt.",
      occasion_rules: {
        tet: {
          status: "ok",
          note_vi: "Kinh \u0111i\u1EC3n cho nam gi\u1EDBi ch\xFAc T\u1EBFt, \u0111i l\u1EC5 \u0111\u1EA7u n\u0103m c\xF9ng kh\u0103n x\u1EBFp."
        },
        "ky-yeu": {
          status: "ok",
          note_vi: "L\xEAn \u1EA3nh trang tr\u1ECDng, phong th\xE1i nho nh\xE3."
        },
        "cuoi-hoi": {
          status: "ok",
          note_vi: "R\u1EA5t h\u1EE3p cho ch\xFA r\u1EC3, hai h\u1ECD v\xE0 quan vi\xEAn."
        },
        "le-hoi-dinh-chua": {
          status: "ok",
          note_vi: "\u0110\xFAng tinh th\u1EA7n t\xF4n nghi\xEAm s\xE2n \u0111\xECnh, vi\u1EC7c h\u1ECD."
        },
        "dao-pho": {
          status: "caution",
          note_vi: "Trang ph\u1EE5c trang tr\u1ECDng; m\u1EB7c d\u1EA1o ph\u1ED1 n\xEAn ph\u1ED1i nh\u1EB9 nh\xE0ng v\u1EDBi gi\xE0y l\u01B0\u1EDDi ho\u1EB7c sneaker."
        },
        "trung-thu": {
          status: "ok",
          note_vi: "H\u1EE3p kh\xF4ng kh\xED ho\xE0i c\u1ED5, r\u01B0\u1EDBc \u0111\xE8n."
        }
      },
      remix: {
        ok: [
          "quan-tay",
          "giay-luoi",
          "ao-len-cai-cuc",
          "ao-vest",
          "bot-co-cao"
        ],
        caution: [
          "quan-bo-ong-rong",
          "giay-cao-co",
          "ao-khoac-bo",
          "ao-mang-to",
          "so-mi-oversize",
          "ao-co-lo"
        ],
        conflict: [
          "ao-ni-mu",
          "mu-luoi-trai",
          "mu-tai-beo",
          "ao-thun-trang",
          "ao-croptop",
          "quan-cargo",
          "quan-ong-loe",
          "giay-de-tho",
          "tui-bao-tu",
          "tai-nghe",
          "chan-vay-xep-ly",
          "chan-vay-bo"
        ]
      },
      colors_classic: [
        "den-tuyen",
        "xanh-cham",
        "nau-song"
      ],
      dont_confuse_with: [
        {
          name: "\xC1o t\u1EA5c",
          how_vi: "\xC1o the tay h\u1EB9p ho\u1EB7c v\u1EEBa, b\u1EB1ng v\u1EA3i sa/the m\u1ECFng; \xE1o t\u1EA5c tay th\u1EE5ng r\u1EA5t r\u1ED9ng, may b\u1EB1ng l\u1EE5a d\xE0y h\u01A1n."
        },
        {
          name: "\xC1o the n\u1EEF",
          how_vi: "\xC1o the nam d\xE0i qu\xE1 g\u1ED1i, k\u1EBFt c\u1EA5u ng\u0169 th\xE2n c\u1ED5 \u0111\u1EE9ng c\xE0i 5 khuy b\xEAn ph\u1EA3i; \xE1o the n\u1EEF th\u01B0\u1EDDng l\xE0 t\u1EE9 th\xE2n ho\u1EB7c bi\u1EBFn th\u1EC3 m\u1EB7c ngo\xE0i y\u1EBFm."
        }
      ],
      sources: [
        "src:ngan-nam-ao-mu",
        "src:btls-tphcm"
      ],
      verified: false,
      contested_vi: [
        "T\xEAn g\u1ECDi v\u1EA3i the, sa, xuy\u1EBFn c\xF3 s\u1EF1 ph\xE2n bi\u1EC7t chi ti\u1EBFt v\u1EC1 \u0111\u1ED9 d\u1EC7t th\u01B0a v\xE0 hoa v\u0103n ch\xECm theo t\u1EEBng l\xE0ng ngh\u1EC1."
      ]
    },
    {
      id: "ao-vien-linh",
      name: "\xC1o vi\xEAn l\u0129nh",
      aliases: [
        "vi\xEAn l\u0129nh",
        "\xE1o c\u1ED5 tr\xF2n",
        "\u0111o\xE0n l\u0129nh"
      ],
      period: "Th\u1EDDi L\xFD \u2013 Tr\u1EA7n \u2013 L\xEA s\u01A1 (th\u1EBF k\u1EF7 11\u201315)",
      region: "all",
      gender: "nam",
      formality: 90,
      must_show: [
        "collar",
        "hem"
      ],
      levels: [
        1,
        2
      ],
      structure: {
        collar: "C\u1ED5 tr\xF2n kho\xE9t s\xE1t ch\xE2n c\u1ED5, kh\xE9p k\xEDn b\u1EB1ng c\xFAc b\xEAn vai ph\u1EA3i",
        closure: "C\xE0i khuy b\xEAn c\u1ED5 v\xE0 vai ph\u1EA3i, v\u1EA1t trong v\u1EA1t ngo\xE0i kh\xE9p k\xEDn",
        sleeves: "Tay th\u1EE5ng r\u1ED9ng (ho\u1EB7c tay ch\u1EBDn tu\u1EF3 th\u1EDDi k\u1EF3)",
        hem: "V\u1EA1t d\xE0i ch\u1EA1m m\u1EAFt c\xE1 ch\xE2n, x\u1EBB t\xE0 ho\u1EB7c may n\u1EB9p",
        worn_with: [
          "Qu\u1EA7n l\u1EE5a",
          "Kh\u0103n x\u1EBFp ho\u1EB7c m\u0169 ph\xE1c \u0111\u1EA7u",
          "H\xE0i"
        ]
      },
      parts: [
        {
          key: "collar",
          x: 0.5,
          y: 0.26
        },
        {
          key: "closure",
          x: 0.52,
          y: 0.28
        },
        {
          key: "sleeves",
          x: 0.28,
          y: 0.46
        },
        {
          key: "hem",
          x: 0.5,
          y: 0.76
        },
        {
          key: "worn_with",
          x: 0.5,
          y: 0.88
        }
      ],
      timeline: [
        {
          year: "Th\u1EBF k\u1EF7 11",
          title_vi: "Kh\u1EDFi ngu\u1ED3n tri\u1EC1u L\xFD \u2013 Tr\u1EA7n",
          text_vi: "\xC1o c\u1ED5 tr\xF2n (vi\xEAn l\u0129nh, \u0111o\xE0n l\u0129nh) \u0111\u01B0\u1EE3c ghi nh\u1EADn trong quy ch\u1EBF tri\u1EC1u ph\u1EE5c v\xE0 th\u01B0\u1EDDng tri\u1EC1u ph\u1EE5c quan l\u1EA1i th\u1EDDi L\xFD \u2013 Tr\u1EA7n. \xC1o kh\xE9p k\xEDn c\u1ED5 mang v\u1EBB trang nghi\xEAm, m\u1EF1c th\u01B0\u1EDBc ch\u1ED1n v\u01B0\u01A1ng tri\u1EC1u.",
          source_ids: [
            "src:ngan-nam-ao-mu"
          ]
        },
        {
          year: "Th\u1EBF k\u1EF7 15",
          title_vi: "Ph\u1EA9m ph\u1EE5c quan l\u1EA1i tri\u1EC1u L\xEA s\u01A1",
          text_vi: "Th\u1EDDi L\xEA Th\xE1nh T\xF4ng, vi\xEAn l\u0129nh tr\u1EDF th\xE0nh ph\u1EA9m ph\u1EE5c chu\u1EA9n m\u1EF1c c\u1EE7a quan l\u1EA1i v\u0103n v\xF5 khi v\xE0o ch\u1EA7u. \xC1o d\xE0i qu\xE1 g\u1ED1i, c\xE0i khuy b\xEAn vai ph\u1EA3i, d\xF9ng \u0111ai th\u1EAFt ngang eo v\xE0 mang h\xE0i cong.",
          source_ids: [
            "src:ngan-nam-ao-mu",
            "src:vietnam-centre"
          ]
        },
        {
          year: "Hi\u1EC7n nay",
          title_vi: "Ph\u1EE5c d\u1EF1ng ph\u1EA9m ph\u1EE5c cung \u0111\xECnh",
          text_vi: "C\xE1c \u0111\u01A1n v\u1ECB nghi\xEAn c\u1EE9u c\u1ED5 ph\u1EE5c \u0110\u1EA1i Vi\u1EC7t ph\u1EE5c d\u1EF1ng m\u1EABu \xE1o vi\xEAn l\u0129nh L\xEA s\u01A1 d\u1EF1a tr\xEAn t\u01B0\u1EE3ng th\u1EDD t\u1EA1i V\u0103n Mi\u1EBFu v\xE0 hi\u1EC7n v\u1EADt kh\u1EA3o c\u1ED5. Trang ph\u1EE5c gi\xFAp c\xF4ng ch\xFAng h\xECnh dung r\xF5 n\xE9t v\u1EC1 ph\u1EA9m ph\u1EE5c quan tr\u01B0\u1EDDng x\u01B0a.",
          source_ids: [
            "src:vietnam-centre"
          ]
        }
      ],
      summary_vi: "\xC1o c\u1ED5 tr\xF2n kh\xE9p k\xEDn c\xE0i khuy b\xEAn vai ph\u1EA3i, v\u1EA1t d\xE0i qu\xE1 g\u1ED1i ho\u1EB7c ch\u1EA5m ch\xE2n. L\xE0 trang ph\u1EE5c ph\u1ED5 bi\u1EBFn c\u1EE7a ho\xE0ng gia v\xE0 quan vi\xEAn th\u1EDDi L\xFD, Tr\u1EA7n, L\xEA; mang v\u1EBB trang nghi\xEAm, m\u1EF1c th\u01B0\u1EDBc.",
      history_vi: "Vi\xEAn l\u0129nh (\u0111o\xE0n l\u0129nh) xu\u1EA5t hi\u1EC7n s\u1EDBm trong l\u1ECBch s\u1EED y ph\u1EE5c \u0110\u1EA1i Vi\u1EC7t, \u0111\u01B0\u1EE3c ghi nh\u1EADn qua t\u01B0\u1EE3ng v\xE0 th\u01B0 t\u1ECBch t\u1EEB th\u1EDDi L\xFD, Tr\u1EA7n \u0111\u1EBFn L\xEA s\u01A1 nh\u01B0 m\u1ED9t d\u1EA1ng ph\u1EA9m ph\u1EE5c quan l\u1EA1i. Sang th\u1EDDi Nguy\u1EC5n, vi\xEAn l\u0129nh \xEDt d\xF9ng h\u01A1n v\xE0 nh\u01B0\u1EDDng ch\u1ED7 cho \xE1o giao l\u0129nh, b\u1ED5 ph\u1EE5c v\xE0 \xE1o t\u1EA5c.",
      occasion_rules: {
        tet: {
          status: "ok",
          note_vi: "Trang tr\u1ECDng cho d\u1ECBp l\u1EC5 h\u1ED9i v\xE0 ch\u1EE5p \u1EA3nh c\u1ED5 ph\u1EE5c."
        },
        "ky-yeu": {
          status: "ok",
          note_vi: "N\u1ED5i b\u1EADt trong b\u1ED1i c\u1EA3nh ki\u1EBFn tr\xFAc c\u1ED5, V\u0103n Mi\u1EBFu, Ho\xE0ng th\xE0nh."
        },
        "cuoi-hoi": {
          status: "ok",
          note_vi: "R\u1EA5t h\u1EE3p cho ch\xFA r\u1EC3 trong l\u1EC5 c\u01B0\u1EDBi ph\u1EE5c d\u1EF1ng phong c\xE1ch L\xEA."
        },
        "le-hoi-dinh-chua": {
          status: "ok",
          note_vi: "\u0110\xFAng tinh th\u1EA7n t\xF4n nghi\xEAm, nghi l\u1EC5 di t\xEDch."
        },
        "dao-pho": {
          status: "caution",
          note_vi: "L\xE0 c\u1ED5 ph\u1EE5c trang tr\u1ECDng; m\u1EB7c d\u1EA1o ph\u1ED1 n\xEAn x\u1EBFp v\xE0o phong c\xE1ch giao thoa."
        },
        "trung-thu": {
          status: "ok",
          note_vi: "H\u1EE3p bi\u1EC3u di\u1EC5n v\u0103n ho\xE1 v\xE0 s\u1EF1 ki\u1EC7n truy\u1EC1n th\u1ED1ng."
        }
      },
      remix: {
        ok: [
          "quan-tay",
          "giay-luoi",
          "bot-co-cao"
        ],
        caution: [
          "quan-bo-ong-rong",
          "ao-vest",
          "ao-co-lo",
          "ao-khoac-bo"
        ],
        conflict: [
          "ao-ni-mu",
          "mu-tai-beo",
          "mu-luoi-trai",
          "ao-thun-trang",
          "ao-bomber",
          "ao-varsity",
          "ao-khoac-da",
          "ao-mang-to",
          "so-mi-oversize",
          "ao-croptop",
          "quan-cargo",
          "quan-ong-loe",
          "giay-cao-co",
          "giay-de-tho",
          "mu-len",
          "tai-nghe",
          "tui-bao-tu",
          "tui-deo-cheo",
          "balo",
          "that-lung-ban-to",
          "chan-vay-xep-ly",
          "chan-vay-bo"
        ]
      },
      colors_classic: [
        "xanh-cham",
        "do-son",
        "xanh-luc-ngoc",
        "vang-nghe"
      ],
      dont_confuse_with: [
        {
          name: "\xC1o giao l\u0129nh",
          how_vi: "Giao l\u0129nh c\u1ED5 ch\xE9o ch\u1EEF y; vi\xEAn l\u0129nh c\u1ED5 tr\xF2n kho\xE9t k\xEDn, c\xE0i khuy b\xEAn vai ph\u1EA3i."
        },
        {
          name: "\xC1o t\u1EA5c",
          how_vi: "\xC1o t\u1EA5c th\u1EDDi Nguy\u1EC5n c\xF3 c\u1ED5 \u0111\u1EE9ng (l\u1EADp l\u0129nh) c\xE0i 5 khuy; vi\xEAn l\u0129nh c\u1ED5 tr\xF2n."
        }
      ],
      sources: [
        "src:ngan-nam-ao-mu",
        "src:vietnam-centre"
      ],
      verified: false,
      contested_vi: [
        "Quy \u0111\u1ECBnh ch\xEDnh x\xE1c v\u1EC1 hoa v\u0103n b\u1ED5 t\u1EED v\xE0 ch\u1EA5t li\u1EC7u v\u1EA3i c\u1EE7a vi\xEAn l\u0129nh th\u1EDDi L\xEA s\u01A1 ch\u1EE7 y\u1EBFu d\u1EF1a v\xE0o tranh t\u01B0\u1EE3ng v\xE0 ghi ch\xE9p t\u1EA3n m\xE1t."
      ]
    }
  ],
  COLORS: [
    {
      id: "do-son",
      name: "\u0110\u1ECF son",
      hex: "#B4302B",
      element: "Ho\u1EA3",
      meaning_vi: "M\xE0u c\xE1t t\u01B0\u1EDDng c\u1EE7a l\u1EC5 T\u1EBFt v\xE0 c\u01B0\u1EDBi h\u1ECFi; r\u1EF1c r\u1EE1, trang tr\u1ECDng.",
      occasion_notes: {}
    },
    {
      id: "vang-hoang-yen",
      name: "V\xE0ng ho\xE0ng y\u1EBFn",
      hex: "#E2B93B",
      element: "Th\u1ED5",
      meaning_vi: "S\u1EAFc v\xE0ng t\u01B0\u01A1i c\u1EE7a mai, c\xFAc ng\xE0y xu\xE2n; \u1EA5m \xE1p, sang.",
      occasion_notes: {}
    },
    {
      id: "vang-nghe",
      name: "V\xE0ng ngh\u1EC7",
      hex: "#C99A3A",
      element: "Th\u1ED5",
      meaning_vi: "V\xE0ng \u0111\u1EA5t, tr\u1EA7m h\u01A1n ho\xE0ng y\u1EBFn; h\u1EE3p ch\u1EA5t l\u1EE5a m\u1ED9c.",
      occasion_notes: {}
    },
    {
      id: "xanh-cham",
      name: "Xanh ch\xE0m",
      hex: "#2E4A6B",
      element: "Thu\u1EF7",
      meaning_vi: "M\xE0u ch\xE0m nhu\u1ED9m th\u1EE7 c\xF4ng c\u1EE7a v\xF9ng cao v\xE0 l\xE0ng ngh\u1EC1 B\u1EAFc B\u1ED9.",
      occasion_notes: {}
    },
    {
      id: "xanh-luc-ngoc",
      name: "Xanh l\u1EE5c ng\u1ECDc",
      hex: "#4F7F6A",
      element: "M\u1ED9c",
      meaning_vi: "Xanh ng\u1ECDc \u0111i\u1EC1m \u0111\u1EA1m, d\u1EC5 ph\u1ED1i v\u1EDBi v\xE0ng ngh\u1EC7 v\xE0 tr\u1EAFng ng\xE0.",
      occasion_notes: {}
    },
    {
      id: "tim-hue",
      name: "T\xEDm Hu\u1EBF",
      hex: "#6B4C9A",
      element: "Thu\u1EF7",
      meaning_vi: "S\u1EAFc t\xEDm g\u1EAFn v\u1EDBi h\xECnh \u1EA3nh \xE1o d\xE0i n\u1EEF sinh x\u1EE9 Hu\u1EBF; \u0111oan trang.",
      occasion_notes: {}
    },
    {
      id: "hong-dao",
      name: "H\u1ED3ng \u0111\xE0o",
      hex: "#E39BA3",
      element: "Ho\u1EA3",
      meaning_vi: "H\u1ED3ng ph\u1EA5n t\u01B0\u01A1i t\u1EAFn c\u1EE7a hoa \u0111\xE0o; tr\u1EBB trung, h\u1EE3p \u1EA3nh.",
      occasion_notes: {}
    },
    {
      id: "xanh-thien-thanh",
      name: "Xanh thi\xEAn thanh",
      hex: "#7FA6C9",
      element: "Thu\u1EF7",
      meaning_vi: "Xanh tr\u1EDDi nh\u1EB9; m\xE1t m\u1EAFt, h\u1EE3p tr\u01B0a h\xE8 v\xE0 k\u1EF7 y\u1EBFu ngo\xE0i tr\u1EDDi.",
      occasion_notes: {}
    },
    {
      id: "nau-song",
      name: "N\xE2u s\u1ED3ng",
      hex: "#5C4033",
      element: "Th\u1ED5",
      meaning_vi: "N\xE2u nhu\u1ED9m c\u1EE7 n\xE2u, m\u1ED9c m\u1EA1c, \u0111\u1EADm h\u1ED3n qu\xEA B\u1EAFc B\u1ED9.",
      occasion_notes: {}
    },
    {
      id: "hong-sen",
      name: "H\u1ED3ng sen",
      hex: "#D96A8C",
      element: "Ho\u1EA3",
      meaning_vi: "H\u1ED3ng \u0111\u1EADm c\u1EE7a c\xE1nh sen m\xF9a h\u1EA1; t\u01B0\u01A1i m\xE0 v\u1EABn n\u1EC1n n\xE3.",
      occasion_notes: {}
    },
    {
      id: "cam-dat",
      name: "Cam \u0111\u1EA5t",
      hex: "#C4622D",
      element: "Ho\u1EA3",
      meaning_vi: "Cam g\u1EA1ch nung c\u1EE7a t\u01B0\u1EDDng v\xF4i, ng\xF3i c\u0169; \u1EA5m v\xE0 m\u1ED9c.",
      occasion_notes: {}
    },
    {
      id: "xanh-reu",
      name: "Xanh r\xEAu",
      hex: "#55603C",
      element: "M\u1ED9c",
      meaning_vi: "Xanh r\xEAu tr\u1EA7m ph\u1EE7 m\xE1i \u0111\xECnh; h\u1EE3p v\u1EA3i \u0111\u0169i, l\u1EE5a m\u1ED9c.",
      occasion_notes: {}
    },
    {
      id: "xanh-co-vit",
      name: "Xanh c\u1ED5 v\u1ECBt",
      hex: "#2F6D6A",
      element: "Thu\u1EF7",
      meaning_vi: "Xanh pha l\u1EE5c s\xE2u nh\u01B0 men g\u1ED1m c\u1ED5; sang, l\xEAn \u1EA3nh r\u1EA5t \u0103n.",
      occasion_notes: {}
    },
    {
      id: "tim-than",
      name: "T\xEDm than",
      hex: "#3A3555",
      element: "Thu\u1EF7",
      meaning_vi: "T\xEDm ng\u1EA3 than, tr\u1EA7m v\xE0 t\u0129nh; n\u1EC1n t\u1ED1t cho ph\u1EE5 ki\u1EC7n b\u1EA1c.",
      occasion_notes: {}
    },
    {
      id: "be-moc",
      name: "Be m\u1ED9c",
      hex: "#D9C7A8",
      element: "Th\u1ED5",
      light: true,
      meaning_vi: "M\xE0u v\u1EA3i \u0111\u0169i ch\u01B0a nhu\u1ED9m; nh\u1EB9, trung t\xEDnh, d\u1EC5 ph\u1ED1i nh\u1EA5t b\u1EA3ng.",
      occasion_notes: {}
    },
    {
      id: "trang-nga",
      name: "Tr\u1EAFng ng\xE0",
      hex: "#F3EDE0",
      element: "Kim",
      light: true,
      meaning_vi: "Tr\u1EAFng l\u1EE5a t\u01A1 t\u1EB1m; thanh s\u1EA1ch, l\xE0 m\xE0u \xE1o d\xE0i n\u1EEF sinh quen thu\u1ED9c.",
      occasion_notes: {
        tet: {
          status: "caution",
          note_vi: "Theo quan ni\u1EC7m x\u01B0a, tr\u1EAFng g\u1EAFn v\u1EDBi tang l\u1EC5 n\xEAn ng\xE0y T\u1EBFt th\u01B0\u1EDDng tr\xE1nh l\xE0m m\xE0u ch\u1EE7 \u0111\u1EA1o; ph\u1ED1i th\xEAm \u0111i\u1EC3m \u0111\u1ECF ho\u1EB7c v\xE0ng s\u1EBD \u1ED5n."
        },
        "cuoi-hoi": {
          status: "caution",
          note_vi: "Tr\u1EAFng ng\xE0 r\u1EA5t h\u1EE3p c\xF4 d\xE2u; v\u1EDBi kh\xE1ch d\u1EF1 ti\u1EC7c n\xEAn tr\xE1nh tr\u1EAFng to\xE0n th\xE2n \u0111\u1EC3 kh\xF4ng l\u1EABn v\u1EDBi c\xF4 d\xE2u."
        }
      }
    },
    {
      id: "den-tuyen",
      name: "\u0110en tuy\u1EC1n",
      hex: "#1B1A17",
      element: "Thu\u1EF7",
      meaning_vi: "\u0110en s\xE2u, sang tr\u1ECDng, t\u01B0\u01A1ng ph\u1EA3n m\u1EA1nh v\u1EDBi ph\u1EE5 ki\u1EC7n kim lo\u1EA1i.",
      occasion_notes: {
        tet: {
          status: "caution",
          note_vi: "D\xE2n gian ki\xEAng m\u1EB7c \u0111en to\xE0n th\xE2n ng\xE0y \u0111\u1EA7u n\u0103m; n\u1EBFu ch\u1ECDn \u0111en, th\xEAm \u0111i\u1EC3m nh\u1EA5n \u0111\u1ECF son ho\u1EB7c v\xE0ng."
        },
        "cuoi-hoi": {
          status: "caution",
          note_vi: "\u0110en to\xE0n th\xE2n d\u1EC5 b\u1ECB xem l\xE0 k\xE9m may m\u1EAFn trong \u0111\xE1m c\u01B0\u1EDBi truy\u1EC1n th\u1ED1ng; d\xF9ng l\xE0m m\xE0u ph\u1EE5 th\xEC \u1ED5n."
        }
      }
    }
  ],
  COLOR_FACTS: [
    {
      id: "mo-ba",
      text_vi: "L\u1ED1i m\u1EB7c \xE1o m\u1EDB ba, m\u1EDB b\u1EA3y x\u01B0a: nhi\u1EC1u l\u1EDBp \xE1o ch\u1ED3ng l\xEAn nhau, l\u1EDBp ngo\xE0i m\xE0u tr\u1EA7m nh\u01B0 n\xE2u, \u0111en, l\u1EDBp trong m\xE0u t\u01B0\u01A1i nh\u01B0 v\xE0ng m\u1EE1 g\xE0, h\u1ED3ng \u0111\xE0o, xanh h\u1ED3 thu\u1EF7 h\xE9 ra \u1EDF c\u1ED5.",
      color_ids: [
        "nau-song",
        "den-tuyen",
        "vang-hoang-yen",
        "hong-dao",
        "xanh-luc-ngoc"
      ],
      source_ids: [
        "src:ttvh-mo-ba",
        "src:vusta-phu-nu-xua"
      ],
      verified: false
    },
    {
      id: "sac-vui",
      text_vi: "\u0110\u1ECF, v\xE0ng, h\u1ED3ng l\xE0 nh\u1EEFng s\u1EAFc vui, h\u1EE3p d\u1ECBp T\u1EBFt, c\u01B0\u1EDBi h\u1ECFi, m\u1EEBng th\u1ECD.",
      color_ids: [
        "do-son",
        "vang-hoang-yen",
        "vang-nghe",
        "hong-dao",
        "hong-sen"
      ],
      source_ids: [
        "src:scov-mau-sac"
      ],
      verified: false
    },
    {
      id: "mau-tang",
      text_vi: "Tr\u1EAFng, \u0111en, xanh, t\xEDm t\u1EEBng l\xE0 m\xE0u tang; v\xEC v\u1EADy to\xE0n tr\u1EAFng ho\u1EB7c tr\u1EAFng \u0111en l\xE0m c\u1EA3 b\u1ED9 cho T\u1EBFt, c\u01B0\u1EDBi h\u1ECFi n\xEAn c\xE2n nh\u1EAFc. \xC1o d\xE0i tr\u1EAFng n\u1EEF sinh v\u1EABn l\xE0 h\xECnh \u1EA3nh quen thu\u1ED9c, kh\xF4ng c\xF3 g\xEC ki\xEAng.",
      color_ids: [
        "trang-nga",
        "den-tuyen",
        "xanh-cham",
        "tim-hue",
        "tim-than"
      ],
      source_ids: [
        "src:scov-mau-sac"
      ],
      verified: false
    },
    {
      id: "dinh-chua",
      text_vi: "\u0110i \u0111\xECnh ch\xF9a h\u1EE3p m\xE0u n\xE2u, ch\xE0m v\xE0 c\xE1c s\u1EAFc tr\u1EA7m; m\xE0u qu\xE1 r\u1EF1c n\xEAn ti\u1EBFt ch\u1EBF.",
      color_ids: [
        "nau-song",
        "xanh-cham",
        "xanh-reu",
        "tim-than"
      ],
      source_ids: [
        "src:scov-mau-sac"
      ],
      verified: false
    },
    {
      id: "vang-le-phuc",
      text_vi: "M\xE0u v\xE0ng t\u01B0\u01A1i tr\xEAn l\u1EC5 ph\u1EE5c d\u1EC5 g\u1EE3i t\u1EDBi ho\xE0ng b\xE0o c\u1EE7a vua.",
      color_ids: [
        "vang-hoang-yen"
      ],
      source_ids: [
        "src:scov-mau-sac"
      ],
      verified: false
    },
    {
      id: "dong-ho",
      text_vi: "Tranh \u0110\xF4ng H\u1ED3 d\xF9ng n\u0103m m\xE0u l\u1EA5y t\u1EEB t\u1EF1 nhi\xEAn: \u0111\u1ECF son, v\xE0ng ho\xE8, xanh ch\xE0m, tr\u1EAFng \u0111i\u1EC7p, \u0111en than.",
      color_ids: [
        "do-son",
        "vang-hoang-yen",
        "xanh-co-vit",
        "trang-nga",
        "den-tuyen"
      ],
      source_ids: [
        "src:artnam-dong-ho",
        "src:dsvh-dong-ho"
      ],
      verified: false
    }
  ],
  DONG_HO_FIVE: [
    "do-son",
    "vang-hoang-yen",
    "xanh-co-vit",
    "trang-nga",
    "den-tuyen"
  ],
  ACCESSORIES: [
    {
      id: "khan-van",
      name: "Kh\u0103n v\u1EA5n",
      category: "\u0110\u1EA7u",
      formality: 75,
      classic_with: [
        "ao-dai",
        "ao-ngu-than",
        "ao-tac",
        "ao-nhat-binh"
      ],
      note_vi: "Kh\u0103n v\u1EA5n tr\xF2n c\u1EE7a ph\u1EE5 n\u1EEF th\u1EDDi Nguy\u1EC5n, \u0111i c\xF9ng \xE1o ng\u0169 th\xE2n v\xE0 \xE1o d\xE0i.",
      hex: "#6B4C9A"
    },
    {
      id: "khan-xep",
      name: "Kh\u0103n x\u1EBFp",
      category: "\u0110\u1EA7u",
      formality: 80,
      classic_with: [
        "ao-ngu-than",
        "ao-tac"
      ],
      note_vi: "Kh\u0103n x\u1EBFp c\u1EE7a nam gi\u1EDBi, \u0111i c\xF9ng \xE1o ng\u0169 th\xE2n v\xE0 \xE1o t\u1EA5c trong l\u1EC5.",
      hex: "#1B1A17"
    },
    {
      id: "non-la",
      name: "N\xF3n l\xE1",
      category: "\u0110\u1EA7u",
      formality: 40,
      classic_with: [
        "ao-dai",
        "ao-ba-ba",
        "ao-tu-than"
      ],
      note_vi: "N\xF3n l\xE1 ph\u1ED5 bi\u1EBFn kh\u1EAFp ba mi\u1EC1n; h\u1EE3p \u1EA3nh ngo\xE0i tr\u1EDDi.",
      hex: "#E8D9B0"
    },
    {
      id: "non-quai-thao",
      name: "N\xF3n quai thao",
      category: "\u0110\u1EA7u",
      formality: 60,
      classic_with: [
        "ao-tu-than"
      ],
      note_vi: "N\xF3n quai thao g\u1EAFn v\u1EDBi li\u1EC1n ch\u1ECB quan h\u1ECD Kinh B\u1EAFc v\xE0 \xE1o t\u1EE9 th\xE2n.",
      hex: "#C9B37E"
    },
    {
      id: "khan-mo-qua",
      name: "Kh\u0103n m\u1ECF qu\u1EA1",
      category: "\u0110\u1EA7u",
      formality: 50,
      classic_with: [
        "ao-tu-than"
      ],
      note_vi: "Kh\u0103n vu\xF4ng \u0111en ch\xEDt th\xE0nh h\xECnh m\u1ECF qu\u1EA1, \u0111i c\xF9ng \xE1o t\u1EE9 th\xE2n B\u1EAFc B\u1ED9.",
      hex: "#1B1A17"
    },
    {
      id: "khan-ran",
      name: "Kh\u0103n r\u1EB1n",
      category: "\u0110\u1EA7u",
      formality: 25,
      classic_with: [
        "ao-ba-ba"
      ],
      note_vi: "Kh\u0103n ca-r\xF4 \u0111en tr\u1EAFng Nam B\u1ED9, \u0111i c\xF9ng \xE1o b\xE0 ba.",
      hex: "#2A2A2A"
    },
    {
      id: "guoc-moc",
      name: "Gu\u1ED1c m\u1ED9c",
      category: "Ch\xE2n",
      formality: 55,
      classic_with: [
        "ao-dai",
        "ao-tu-than",
        "ao-ba-ba",
        "ao-ngu-than"
      ],
      note_vi: "Gu\u1ED1c g\u1ED7 quai da ho\u1EB7c quai v\u1EA3i; h\u1EE3p \xE1o d\xE0i v\xE0 t\u1EE9 th\xE2n.",
      hex: "#A8743C"
    },
    {
      id: "hai-theu",
      name: "H\xE0i th\xEAu",
      category: "Ch\xE2n",
      formality: 85,
      classic_with: [
        "ao-nhat-binh",
        "ao-tac",
        "ao-giao-linh"
      ],
      note_vi: "H\xE0i m\u0169i cong th\xEAu hoa v\u0103n, \u0111i v\u1EDBi l\u1EC5 ph\u1EE5c v\xE0 \xE1o cung \u0111\xECnh.",
      hex: "#C99A3A"
    },
    {
      id: "giay-the-thao",
      name: "Gi\xE0y th\u1EC3 thao",
      category: "Ch\xE2n",
      formality: 15,
      classic_with: [],
      note_vi: "Gi\xE0y th\u1EC3 thao tr\u1EAFng l\xE0 c\xE1ch ph\u1ED1i hi\u1EC7n \u0111\u1EA1i quen thu\u1ED9c v\u1EDBi \xE1o d\xE0i, ng\u0169 th\xE2n.",
      hex: "#EAE5D9"
    },
    {
      id: "tui-vai",
      name: "T\xFAi v\u1EA3i",
      category: "T\xFAi",
      formality: 20,
      classic_with: [],
      note_vi: "T\xFAi v\u1EA3i \u0111eo vai, ti\u1EC7n \u0111i h\u1ECDc, \u0111i ch\u01A1i.",
      hex: "#D9CDB4"
    },
    {
      id: "kinh-mat",
      name: "K\xEDnh m\u1EAFt",
      category: "Trang s\u1EE9c",
      formality: 30,
      classic_with: [],
      note_vi: "K\xEDnh g\u1ECDng tr\xF2n m\u1EA3nh t\u1EA1o n\xE9t ho\xE0i c\u1ED5; k\xEDnh r\xE2m h\u1EE3p d\u1EA1o ph\u1ED1.",
      hex: "#1B1A17"
    },
    {
      id: "vong-co",
      name: "V\xF2ng c\u1ED5 ng\u1ECDc / b\u1EA1c",
      category: "Trang s\u1EE9c",
      formality: 65,
      classic_with: [
        "ao-dai",
        "ao-ngu-than",
        "ao-nhat-binh"
      ],
      note_vi: "Ki\u1EC1ng b\u1EA1c ho\u1EB7c chu\u1ED7i ng\u1ECDc, \u0111i\u1EC3m nh\u1EA5n c\u1ED5 \xE1o.",
      hex: "#B8C4B0"
    },
    {
      id: "quat-giay",
      name: "Qu\u1EA1t gi\u1EA5y",
      category: "C\u1EA7m tay",
      formality: 50,
      classic_with: [
        "ao-dai",
        "ao-tu-than",
        "ao-giao-linh",
        "ao-tac"
      ],
      note_vi: "Qu\u1EA1t gi\u1EA5y ho\u1EB7c qu\u1EA1t l\u1EE5a; \u0111\u1EA1o c\u1EE5 ch\u1EE5p \u1EA3nh \u0111\u1EB9p.",
      hex: "#E8D9B0"
    },
    {
      id: "tram-cai-toc",
      name: "Tr\xE2m c\xE0i t\xF3c",
      category: "\u0110\u1EA7u",
      formality: 70,
      classic_with: [
        "ao-dai",
        "ao-ngu-than",
        "ao-nhat-binh",
        "ao-giao-linh"
      ],
      note_vi: "Tr\xE2m b\u1EA1c ho\u1EB7c tr\xE2m ng\u1ECDc c\xE0i b\xFAi t\xF3c; g\u1ECDn m\xE0 v\u1EABn ra l\u1EC5.",
      hex: "#C0C6BE"
    },
    {
      id: "khuyen-ngoc",
      name: "Khuy\xEAn ng\u1ECDc",
      category: "Trang s\u1EE9c",
      formality: 55,
      classic_with: [
        "ao-dai",
        "ao-ngu-than",
        "ao-nhat-binh"
      ],
      note_vi: "Khuy\xEAn tai ng\u1ECDc ho\u1EB7c b\u1EA1c, \u0111i\u1EC3m s\xE1ng nh\u1ECF c\u1EA1nh g\u01B0\u01A1ng m\u1EB7t.",
      hex: "#8FB39B"
    },
    {
      id: "vong-tay-bac",
      name: "V\xF2ng tay b\u1EA1c",
      category: "Trang s\u1EE9c",
      formality: 45,
      classic_with: [
        "ao-dai",
        "ao-tu-than",
        "ao-ba-ba"
      ],
      note_vi: "V\xF2ng b\u1EA1c tr\u01A1n ho\u1EB7c ch\u1EA1m; h\u1EE3p c\u1EA3 l\u1ED1i truy\u1EC1n th\u1ED1ng l\u1EABn hi\u1EC7n \u0111\u1EA1i.",
      hex: "#B9C2BC"
    },
    {
      id: "thao-dai",
      name: "Thao \u0111ai",
      category: "Trang s\u1EE9c",
      formality: 80,
      classic_with: [
        "ao-tac",
        "ao-giao-linh",
        "ao-ngu-than"
      ],
      note_vi: "D\u1EA3i \u0111ai l\u1EE5a th\u1EAFt ngang eo c\u1EE7a l\u1EC5 ph\u1EE5c; bu\u1ED9c m\xFAi th\u1EA3 xu\u1ED1ng tr\u01B0\u1EDBc.",
      hex: "#C99A3A"
    },
    {
      id: "o-giay",
      name: "\xD4 gi\u1EA5y",
      category: "C\u1EA7m tay",
      formality: 45,
      classic_with: [
        "ao-dai",
        "ao-tu-than",
        "ao-ngu-than"
      ],
      note_vi: "\xD4 gi\u1EA5y d\u1EA7u che n\u1EAFng; khung h\xECnh r\u1EA5t h\u1EE3p \u1EA3nh ngo\xE0i tr\u1EDDi.",
      hex: "#D8785F"
    }
  ],
  MODERN_PIECES: [
    {
      id: "ao-khoac-bo",
      name: "\xC1o kho\xE1c b\xF2",
      category: "Kho\xE1c",
      formality: 25,
      layer: "over",
      hex: "#7A93B5",
      hex2: "#E2C77A",
      bulk: 0.6,
      covers: [
        "sleeves"
      ],
      length: "short",
      note_vi: "Kho\xE1c b\xF2 c\u1ED5 b\u1EBB, ch\u1EC9 v\xE0ng \u2014 c\xE1ch ph\u1ED1i giao thoa quen thu\u1ED9c nh\u1EA5t."
    },
    {
      id: "ao-vest",
      name: "\xC1o vest",
      category: "Kho\xE1c",
      formality: 70,
      layer: "over",
      hex: "#2E2E33",
      hex2: "#C9C4B8",
      bulk: 0.55,
      covers: [
        "sleeves"
      ],
      length: "short",
      note_vi: "Vest ve ch\u1EEF V, d\xE1ng su\xF4ng; n\xE2ng \u0111\u1ED9 trang tr\u1ECDng cho \xE1o d\xE0i, ng\u0169 th\xE2n."
    },
    {
      id: "ao-ni-mu",
      name: "\xC1o n\u1EC9 c\xF3 m\u0169",
      category: "Kho\xE1c",
      formality: 10,
      layer: "over",
      hex: "#8A8F98",
      hex2: "#6E727A",
      bulk: 0.8,
      covers: [
        "collar",
        "closure",
        "sleeves"
      ],
      length: "short",
      note_vi: "Hoodie tr\xF9m m\u0169; ph\xE1 phom m\u1EA1nh, ch\u1EC9 h\u1EE3p d\u1ECBp th\u1EADt tho\u1EA3i m\xE1i."
    },
    {
      id: "ao-len-cai-cuc",
      name: "\xC1o len c\xE0i c\xFAc",
      category: "Kho\xE1c",
      formality: 45,
      layer: "over",
      hex: "#B9A47E",
      hex2: "#8E7B58",
      bulk: 0.5,
      covers: [
        "sleeves"
      ],
      length: "short",
      note_vi: "Cardigan len m\u1ECFng, bu\xF4ng d\xE0i \u2014 l\u1EDBp kho\xE1c d\u1ECBu nh\u1EA5t cho Vi\u1EC7t ph\u1EE5c."
    },
    {
      id: "ao-bomber",
      name: "\xC1o bomber",
      category: "Kho\xE1c",
      formality: 20,
      layer: "over",
      hex: "#3C4A3E",
      hex2: "#C7A24A",
      bulk: 0.7,
      covers: [
        "sleeves"
      ],
      length: "short",
      note_vi: "Bomber bo g\u1EA5u, kho\xE1 k\xE9o; d\xE1ng ng\u1EAFn n\xEAn gi\u1EEF \u0111\u01B0\u1EE3c t\xE0 \xE1o ph\xEDa d\u01B0\u1EDBi."
    },
    {
      id: "ao-varsity",
      name: "\xC1o kho\xE1c b\xF3ng ch\xE0y",
      category: "Kho\xE1c",
      formality: 15,
      layer: "over",
      hex: "#3B3A44",
      hex2: "#E8E2D4",
      bulk: 0.7,
      covers: [
        "sleeves"
      ],
      length: "short",
      note_vi: "Varsity tay kh\xE1c m\xE0u, bo c\u1ED5 k\u1EBB s\u1ECDc; ch\u1EA5t Gen Z r\xF5 nh\u1EA5t."
    },
    {
      id: "ao-khoac-da",
      name: "\xC1o kho\xE1c da",
      category: "Kho\xE1c",
      formality: 30,
      layer: "over",
      hex: "#2B2724",
      hex2: "#9A9188",
      bulk: 0.65,
      covers: [
        "sleeves"
      ],
      length: "short",
      note_vi: "Kho\xE1c da c\u1ED5 v\xE1t, kho\xE1 l\u1EC7ch; t\u01B0\u01A1ng ph\u1EA3n m\u1EA1nh v\u1EDBi l\u1EE5a."
    },
    {
      id: "ao-mang-to",
      name: "\xC1o m\u0103ng t\xF4 d\xE0i",
      category: "Kho\xE1c",
      formality: 55,
      layer: "over",
      hex: "#9C8E76",
      hex2: "#6F6555",
      bulk: 0.75,
      covers: [
        "sleeves"
      ],
      length: "long",
      note_vi: "M\u0103ng t\xF4 d\xE1ng d\xE0i ph\u1EE7 qu\xE1 g\u1ED1i; gi\u1EEF \u0111\u01B0\u1EE3c \u0111\u01B0\u1EDDng d\u1ECDc c\u1EE7a \xE1o d\xE0i."
    },
    {
      id: "so-mi-oversize",
      name: "S\u01A1 mi oversize",
      category: "Kho\xE1c",
      formality: 40,
      layer: "over",
      hex: "#D8DEE6",
      hex2: "#A9B4C0",
      bulk: 0.55,
      covers: [
        "sleeves"
      ],
      length: "mid",
      note_vi: "S\u01A1 mi r\u1ED9ng m\u1EB7c m\u1EDF, coi nh\u01B0 l\u1EDBp kho\xE1c nh\u1EB9; d\u1EC5 ph\u1ED1i, d\u1EC5 c\u1EDFi."
    },
    {
      id: "ao-thun-trang",
      name: "\xC1o thun tr\u1EAFng",
      category: "\xC1o",
      formality: 20,
      layer: "under",
      hex: "#F3EDE0",
      bulk: 0.15,
      covers: [],
      note_vi: "\xC1o thun c\u1ED5 tr\xF2n l\xF3t trong, h\u1EDF \u1EDF c\u1ED5 \xE1o \u2014 m\u1EB9o ph\u1ED1i ph\u1ED5 bi\u1EBFn v\u1EDBi \xE1o d\xE0i."
    },
    {
      id: "ao-co-lo",
      name: "\xC1o c\u1ED5 l\u1ECD",
      category: "\xC1o",
      formality: 40,
      layer: "under",
      hex: "#2C2A28",
      bulk: 0.2,
      covers: [
        "collar"
      ],
      note_vi: "C\u1ED5 l\u1ECD m\u1ECFng m\u1EB7c trong, k\xEDn c\u1ED5; h\u1EE3p tr\u1EDDi l\u1EA1nh v\xE0 kh\xF4ng gian t\xF4n nghi\xEAm."
    },
    {
      id: "ao-croptop",
      name: "\xC1o croptop",
      category: "\xC1o",
      formality: 10,
      layer: "under",
      hex: "#E7DFD2",
      bulk: 0.15,
      covers: [],
      note_vi: "Croptop m\u1EB7c trong \xE1o d\xE0i x\u1EBB t\xE0 cao; t\xE1o b\u1EA1o, ch\u1EC9 h\u1EE3p d\u1EA1o ph\u1ED1."
    },
    {
      id: "quan-bo-ong-rong",
      name: "Qu\u1EA7n b\xF2 \u1ED1ng r\u1ED9ng",
      category: "Qu\u1EA7n / v\xE1y",
      formality: 25,
      layer: "swap",
      hex: "#5A6E8C",
      hex2: "#E2C77A",
      bulk: 0.6,
      covers: [],
      note_vi: "Qu\u1EA7n b\xF2 \u1ED1ng r\u1ED9ng thay qu\u1EA7n l\u1EE5a \u2014 phom v\u1EABn d\u1ECDc n\xEAn \xEDt ph\xE1 d\xE1ng."
    },
    {
      id: "quan-tay",
      name: "Qu\u1EA7n t\xE2y",
      category: "Qu\u1EA7n / v\xE1y",
      formality: 60,
      layer: "swap",
      hex: "#3B3A37",
      bulk: 0.5,
      covers: [],
      note_vi: "Qu\u1EA7n t\xE2y ly gi\u1EEFa, \u1ED1ng \u0111\u1EE9ng; thay qu\u1EA7n l\u1EE5a m\xE0 v\u1EABn gi\u1EEF n\xE9t ch\u1EC9n chu."
    },
    {
      id: "chan-vay-xep-ly",
      name: "Ch\xE2n v\xE1y x\u1EBFp ly",
      category: "Qu\u1EA7n / v\xE1y",
      formality: 45,
      layer: "swap",
      hex: "#8C6D4F",
      bulk: 0.55,
      covers: [],
      note_vi: "V\xE1y x\u1EBFp ly d\xE0i qua g\u1ED1i; g\u1EA7n v\u1EDBi v\xE1y \u0111\u1EE5p n\xEAn \u0103n nh\u1EADp v\u1EDBi \xE1o t\u1EE9 th\xE2n."
    },
    {
      id: "quan-cargo",
      name: "Qu\u1EA7n t\xFAi h\u1ED9p",
      category: "Qu\u1EA7n / v\xE1y",
      formality: 15,
      layer: "swap",
      hex: "#6B6A55",
      hex2: "#4E4D3E",
      bulk: 0.65,
      covers: [],
      note_vi: "Cargo t\xFAi h\u1ED9p hai b\xEAn; ch\u1EA5t \u0111\u01B0\u1EDDng ph\u1ED1, ph\xE1 phom nhi\u1EC1u nh\u1EA5t trong nh\xF3m qu\u1EA7n."
    },
    {
      id: "chan-vay-bo",
      name: "Ch\xE2n v\xE1y b\xF2",
      category: "Qu\u1EA7n / v\xE1y",
      formality: 20,
      layer: "swap",
      hex: "#6982A3",
      hex2: "#E2C77A",
      bulk: 0.5,
      covers: [],
      note_vi: "V\xE1y b\xF2 d\xE1ng ch\u1EEF A ngang g\u1ED1i; tr\u1EBB, h\u1EE3p \xE1o b\xE0 ba v\xE0 \xE1o c\xE1nh."
    },
    {
      id: "quan-ong-loe",
      name: "Qu\u1EA7n \u1ED1ng loe",
      category: "Qu\u1EA7n / v\xE1y",
      formality: 30,
      layer: "swap",
      hex: "#5C5470",
      bulk: 0.6,
      covers: [],
      note_vi: "\u1ED0ng loe t\u1EEB g\u1ED1i xu\u1ED1ng; d\xE1ng d\u1ECDc k\xE9o ng\u01B0\u1EDDi cao, ch\u1EA5t retro r\u1EA5t \u0103n \u1EA3nh."
    },
    {
      id: "giay-luoi",
      name: "Gi\xE0y l\u01B0\u1EDDi",
      category: "Gi\xE0y",
      formality: 55,
      layer: "feet",
      hex: "#5C4033",
      hex2: "#C99A3A",
      bulk: 0.2,
      covers: [],
      note_vi: "Loafer da, m\u0169i tr\xF2n; an to\xE0n cho g\u1EA7n nh\u01B0 m\u1ECDi d\xE1ng \xE1o."
    },
    {
      id: "bot-co-cao",
      name: "B\u1ED1t c\u1ED5 cao",
      category: "Gi\xE0y",
      formality: 40,
      layer: "feet",
      hex: "#3E2F25",
      hex2: "#2A2019",
      bulk: 0.35,
      covers: [],
      note_vi: "B\u1ED1t \xF4m c\u1ED5 ch\xE2n; \u0103n \xFD v\u1EDBi t\xE0 \xE1o d\xE0i v\xE0 v\xE1y x\u1EBFp ly."
    },
    {
      id: "giay-cao-co",
      name: "Gi\xE0y cao c\u1ED5",
      category: "Gi\xE0y",
      formality: 20,
      layer: "feet",
      hex: "#E8E3D7",
      hex2: "#B4302B",
      bulk: 0.3,
      covers: [],
      note_vi: "Sneaker cao c\u1ED5 bu\u1ED9c d\xE2y; l\u1ED1i ph\u1ED1i kinh \u0111i\u1EC3n c\u1EE7a h\u1ECDc sinh v\u1EDBi \xE1o d\xE0i."
    },
    {
      id: "giay-de-tho",
      name: "Gi\xE0y \u0111\u1EBF th\xF4",
      category: "Gi\xE0y",
      formality: 15,
      layer: "feet",
      hex: "#EDE7DA",
      hex2: "#3B3A37",
      bulk: 0.35,
      covers: [],
      note_vi: "Sneaker \u0111\u1EBF d\xE0y; t\xF4n d\xE1ng nh\u01B0ng l\xE0m g\u1EA5u \xE1o tr\xF4ng ng\u1EAFn l\u1EA1i."
    },
    {
      id: "giay-bup-be",
      name: "Gi\xE0y b\xFAp b\xEA",
      category: "Gi\xE0y",
      formality: 45,
      layer: "feet",
      hex: "#8C2F3A",
      hex2: "#E8D9B0",
      bulk: 0.15,
      covers: [],
      note_vi: "B\xFAp b\xEA quai ngang, g\xF3t th\u1EA5p; nh\u1EB9 nh\xE0ng, h\u1EE3p k\u1EF7 y\u1EBFu v\xE0 T\u1EBFt."
    },
    {
      id: "mu-luoi-trai",
      name: "M\u0169 l\u01B0\u1EE1i trai",
      category: "M\u0169",
      formality: 10,
      layer: "head",
      hex: "#2E4A6B",
      bulk: 0.3,
      covers: [],
      note_vi: "M\u0169 l\u01B0\u1EE1i trai; n\xEAn b\u1ECF ra khi v\xE0o \u0111\xECnh, ch\xF9a ho\u1EB7c khi l\xE0m l\u1EC5."
    },
    {
      id: "mu-tai-beo",
      name: "M\u0169 tai b\xE8o",
      category: "M\u0169",
      formality: 10,
      layer: "head",
      hex: "#8C8C7A",
      bulk: 0.3,
      covers: [],
      note_vi: "Bucket v\xE0nh m\u1EC1m; che n\u1EAFng t\u1ED1t, ch\u1EA5t \u0111\u01B0\u1EDDng ph\u1ED1."
    },
    {
      id: "mu-beret",
      name: "M\u0169 n\u1ED3i",
      category: "M\u0169",
      formality: 40,
      layer: "head",
      hex: "#6B2F35",
      bulk: 0.2,
      covers: [],
      note_vi: "M\u0169 n\u1ED3i l\u1EC7ch \u0111\u1EA7u; g\u1EE3i kh\xF4ng kh\xED H\xE0 N\u1ED9i \u0111\u1EA7u th\u1EBF k\u1EF7 20."
    },
    {
      id: "mu-len",
      name: "M\u0169 len",
      category: "M\u0169",
      formality: 15,
      layer: "head",
      hex: "#5C6B7A",
      bulk: 0.25,
      covers: [],
      note_vi: "M\u0169 len tr\xF9m; \u1EA5m, h\u1EE3p T\u1EBFt mi\u1EC1n B\u1EAFc v\xE0 bu\u1ED5i t\u1ED1i."
    },
    {
      id: "tai-nghe",
      name: "Tai nghe ch\u1EE5p tai",
      category: "M\u0169",
      formality: 5,
      layer: "head",
      hex: "#33363B",
      hex2: "#C9C4B8",
      bulk: 0.2,
      covers: [],
      note_vi: "Tai nghe \u0111eo c\u1ED5 ho\u1EB7c ch\u1EE5p tai; chi ti\u1EBFt \u0111\u1EDDi th\u01B0\u1EDDng l\xE0m b\u1ED9 ph\u1ED1i b\u1EDBt c\u1EE9ng."
    },
    {
      id: "tui-deo-cheo",
      name: "T\xFAi \u0111eo ch\xE9o",
      category: "T\xFAi",
      formality: 25,
      layer: "carry",
      hex: "#4A4640",
      hex2: "#B9A47E",
      bulk: 0.2,
      covers: [],
      note_vi: "T\xFAi nh\u1ECF \u0111eo ch\xE9o ng\u1EF1c; g\u1ECDn, kh\xF4ng v\u01B0\u1EDBng t\xE0 \xE1o."
    },
    {
      id: "balo",
      name: "Ba l\xF4",
      category: "T\xFAi",
      formality: 15,
      layer: "carry",
      hex: "#3E4A52",
      hex2: "#C9B37E",
      bulk: 0.4,
      covers: [],
      note_vi: "Ba l\xF4 hai quai; ti\u1EC7n \u0111i h\u1ECDc nh\u01B0ng che m\u1EA5t l\u01B0ng \xE1o."
    },
    {
      id: "tui-bao-tu",
      name: "T\xFAi bao t\u1EED",
      category: "T\xFAi",
      formality: 10,
      layer: "carry",
      hex: "#7A4E3B",
      bulk: 0.2,
      covers: [
        "waist"
      ],
      note_vi: "T\xFAi bao t\u1EED th\u1EAFt ngang h\xF4ng; r\u1EA5t \u0111\u01B0\u1EDDng ph\u1ED1, h\u1EE3p m\u1EE9c bi\u1EBFn t\u1EA5u cao."
    },
    {
      id: "that-lung-ban-to",
      name: "Th\u1EAFt l\u01B0ng b\u1EA3n to",
      category: "Th\u1EAFt l\u01B0ng",
      formality: 35,
      layer: "waist",
      hex: "#3A3330",
      hex2: "#C9A24A",
      bulk: 0.15,
      covers: [
        "waist"
      ],
      note_vi: "\u0110ai b\u1EA3n to si\u1EBFt eo; \u0111\u1ECBnh l\u1EA1i phom cho \xE1o su\xF4ng nh\u01B0 ng\u0169 th\xE2n, giao l\u0129nh."
    }
  ],
  VIBES: [
    {
      id: "duong-pho",
      name: "\u0110\u01B0\u1EDDng ph\u1ED1",
      desc: "N\u0103ng \u0111\u1ED9ng, ph\xF3ng kho\xE1ng, ph\u1ED1i t\u1EF1 do v\u1EDBi gi\xE0y th\u1EC3 thao v\xE0 \xE1o kho\xE1c.",
      affinity: [
        "giay-the-thao",
        "ao-ni-mu",
        "ao-khoac-bo",
        "ao-bomber",
        "ao-varsity",
        "mu-luoi-trai",
        "mu-tai-beo",
        "tai-nghe",
        "quan-bo-ong-rong",
        "quan-cargo",
        "giay-cao-co",
        "giay-de-tho",
        "tui-bao-tu",
        "tui-deo-cheo",
        "tui-vai",
        "kinh-mat"
      ],
      tone: 1,
      prefers_monochrome: false
    },
    {
      id: "toi-gian",
      name: "T\u1ED1i gi\u1EA3n",
      desc: "\xCDt chi ti\u1EBFt, m\u1ED9t hai m\xE0u, \u0111\u01B0\u1EDDng n\xE9t thanh tho\xE1t.",
      affinity: [
        "giay-luoi",
        "quan-tay",
        "vong-co",
        "ao-thun-trang",
        "ao-co-lo",
        "ao-mang-to",
        "khuyen-ngoc"
      ],
      tone: 0,
      prefers_monochrome: true
    },
    {
      id: "hoai-co",
      name: "Ho\xE0i c\u1ED5 H\xE0 N\u1ED9i",
      desc: "N\xE9t ph\u1ED1 c\u1ED5 \u0111\u1EA7u th\u1EBF k\u1EF7 20: kh\u0103n v\u1EA5n, gu\u1ED1c m\u1ED9c, k\xEDnh tr\xF2n.",
      affinity: [
        "khan-van",
        "guoc-moc",
        "kinh-mat",
        "quat-giay",
        "non-la",
        "o-giay",
        "tram-cai-toc",
        "ao-len-cai-cuc",
        "mu-beret",
        "giay-bup-be"
      ],
      tone: -1,
      prefers_monochrome: false
    },
    {
      id: "hoc-duong",
      name: "H\u1ECDc \u0111\u01B0\u1EDDng thanh l\u1ECBch",
      desc: "Nh\xE3 nh\u1EB7n, g\u1ECDn g\xE0ng, h\u1EE3p s\xE2n tr\u01B0\u1EDDng v\xE0 l\u1EC5 t\u1ED5ng k\u1EBFt.",
      affinity: [
        "ao-vest",
        "giay-luoi",
        "tui-vai",
        "balo",
        "ao-len-cai-cuc",
        "chan-vay-xep-ly",
        "quan-tay",
        "so-mi-oversize",
        "giay-bup-be"
      ],
      tone: 0,
      prefers_monochrome: false
    },
    {
      id: "le-hoi",
      name: "L\u1EC5 h\u1ED9i r\u1EF1c r\u1EE1",
      desc: "M\xE0u t\u01B0\u01A1i, ph\u1EE5 ki\u1EC7n n\u1ED5i, \u0111\u1EE9ng gi\u1EEFa \u0111\xE1m \u0111\xF4ng l\xE0 nh\u1EADn ra ngay.",
      affinity: [
        "khan-van",
        "non-quai-thao",
        "hai-theu",
        "vong-co",
        "quat-giay",
        "thao-dai",
        "khuyen-ngoc",
        "o-giay"
      ],
      tone: 1,
      prefers_monochrome: false
    },
    {
      id: "moc-mac",
      name: "M\u1ED9c m\u1EA1c th\xF4n qu\xEA",
      desc: "V\u1EA3i m\u1ED9c, m\xE0u \u0111\u1EA5t, ph\u1EE5 ki\u1EC7n \u0111\u1ED3ng qu\xEA; \u1EA5m v\xE0 g\u1EA7n g\u0169i.",
      affinity: [
        "non-la",
        "khan-ran",
        "khan-mo-qua",
        "guoc-moc",
        "tui-vai",
        "vong-tay-bac",
        "chan-vay-xep-ly"
      ],
      tone: -1,
      prefers_monochrome: false
    }
  ],
  SOURCES: [
    {
      id: "src:ngan-nam-ao-mu",
      title: "Tr\u1EA7n Quang \u0110\u1EE9c \u2014 Ng\xE0n n\u0103m \xE1o m\u0169 (Nh\xE3 Nam, 2013)",
      kind: "s\xE1ch",
      note_vi: "Kh\u1EA3o c\u1EE9u trang ph\u1EE5c Vi\u1EC7t Nam t\u1EEB L\xFD \u0111\u1EBFn Nguy\u1EC5n; ngu\u1ED3n ch\xEDnh cho giao l\u0129nh, vi\xEAn l\u0129nh, ng\u0169 th\xE2n."
    },
    {
      id: "src:hoi-dien",
      title: "Kh\xE2m \u0111\u1ECBnh \u0110\u1EA1i Nam h\u1ED9i \u0111i\u1EC3n s\u1EF1 l\u1EC7 (N\u1ED9i c\xE1c tri\u1EC1u Nguy\u1EC5n)",
      kind: "s\xE1ch",
      note_vi: "\u0110i\u1EC3n ch\u1EBF tri\u1EC1u Nguy\u1EC5n; quy \u0111\u1ECBnh ph\u1EA9m ph\u1EE5c, trong \u0111\xF3 c\xF3 \xE1o Nh\u1EADt B\xECnh."
    },
    {
      id: "src:vietnam-centre",
      title: "Vietnam Centre \u2014 d\u1EF1 \xE1n \u201CD\u1EC7t n\xEAn tri\u1EC1u \u0111\u1EA1i\u201D",
      kind: "d\u1EF1 \xE1n ph\u1EE5c d\u1EF1ng",
      note_vi: "Ph\u1EE5c d\u1EF1ng trang ph\u1EE5c L\xEA s\u01A1 \u2013 Nguy\u1EC5n; \u1EA3nh tham chi\u1EBFu k\u1EBFt c\u1EA5u \xE1o."
    },
    {
      id: "src:y-van-hien",
      title: "\u1EF6 V\xE2n Hi\xEAn \u2014 ph\u1EE5c d\u1EF1ng c\u1ED5 ph\u1EE5c",
      kind: "d\u1EF1 \xE1n ph\u1EE5c d\u1EF1ng",
      note_vi: "\u0110\u01A1n v\u1ECB ph\u1EE5c d\u1EF1ng \xE1o ng\u0169 th\xE2n, Nh\u1EADt B\xECnh, giao l\u0129nh; \u1EA3nh tham chi\u1EBFu."
    },
    {
      id: "src:btls-tphcm",
      title: "B\u1EA3o t\xE0ng L\u1ECBch s\u1EED TP.HCM / B\u1EA3o t\xE0ng Ph\u1EE5 n\u1EEF Nam B\u1ED9",
      kind: "b\u1EA3o t\xE0ng",
      note_vi: "Hi\u1EC7n v\u1EADt \xE1o b\xE0 ba, \xE1o d\xE0i \u0111\u1EA7u th\u1EBF k\u1EF7 20."
    },
    {
      id: "src:bt-phu-nu-vn",
      title: "B\u1EA3o t\xE0ng Ph\u1EE5 n\u1EEF Vi\u1EC7t Nam (H\xE0 N\u1ED9i)",
      kind: "b\u1EA3o t\xE0ng",
      note_vi: "Tr\u01B0ng b\xE0y \xE1o t\u1EE9 th\xE2n, y\u1EBFm, kh\u0103n m\u1ECF qu\u1EA1, n\xF3n quai thao."
    },
    {
      id: "src:tu-dien",
      title: "T\u1EEB \u0111i\u1EC3n ti\u1EBFng Vi\u1EC7t (Ho\xE0ng Ph\xEA ch\u1EE7 bi\xEAn)",
      kind: "t\u1EEB \u0111i\u1EC3n",
      note_vi: "\u0110\u1ECBnh ngh\u0129a c\xE1c t\u1EEB: y\u1EBFm, t\u1EE9 th\xE2n, ng\u0169 th\xE2n, giao l\u0129nh\u2026"
    },
    {
      id: "src:vnn-tet-2026",
      title: "VietNamNet \u2014 Tranh c\xE3i v\u1EC1 \xE1o d\xE0i T\u1EBFt: ranh gi\u1EDBi m\u1ECFng manh gi\u1EEFa c\xE1ch t\xE2n v\xE0 x\xE2m l\u1EA5n v\u0103n ho\xE1",
      kind: "b\xE0i b\xE1o",
      note_vi: "Nh\u1EADn di\u1EC7n \xE1o d\xE0i n\u1EB1m \u1EDF phom d\xE1ng v\xE0 c\xE1ch may; tranh lu\u1EADn v\u1EC1 khuy th\u1EAFt n\xFAt.",
      url: "https://vietnamnet.vn/tranh-cai-ve-ao-dai-tet-ranh-gioi-mong-manh-giua-cach-tan-va-xam-lan-van-hoa-2486770.html"
    },
    {
      id: "src:vov-cach-tan",
      title: "VOV \u2014 \xC1o d\xE0i c\xE1ch t\xE2n: s\xE1ng t\u1EA1o nh\u01B0ng ph\u1EA3i c\xF3 ch\u1EEBng m\u1EF1c",
      kind: "b\xE0i b\xE1o",
      note_vi: "\xDD ki\u1EBFn ThS. B\xF9i Th\u1ECB Kim Ph\u01B0\u01A1ng v\xE0 NTK \u0110\u1EE9c H\xF9ng v\u1EC1 gi\u1EDBi h\u1EA1n c\xE1ch t\xE2n.",
      url: "https://vov.gov.vn/ao-dai-cach-tan-sang-tao-nhung-phai-co-chung-muc-dtnew-184863"
    },
    {
      id: "src:dantri-xe-nguc",
      title: "D\xE2n Tr\xED \u2014 \xC1o d\xE0i c\xE1ch t\xE2n x\u1EBB ng\u1EF1c b\u1ECB c\u1ED9ng \u0111\u1ED3ng ph\u1EA3n \u1EE9ng (2025)",
      kind: "b\xE0i b\xE1o",
      note_vi: "Ph\u1EA3n \u1EE9ng c\u1EE7a c\xF4ng ch\xFAng v\u1EDBi \xE1o d\xE0i m\u1EDF khuy khoe n\u1ED9i y.",
      url: "https://dantri.com.vn/giai-tri/ao-dai-cach-tan-xe-nguc-vi-sao-sang-tao-lai-bi-cong-dong-nem-da-20251225091015721.htm"
    },
    {
      id: "src:ttvh-mo-ba",
      title: "Th\u1EC3 thao & V\u0103n ho\xE1 \u2014 Qu\u1EA7n \xE1o m\u1EDB b\u1EA3y m\u1EDB ba th\u1EDDi x\u01B0a",
      kind: "b\xE0i b\xE1o",
      note_vi: "C\xE1ch m\u1EB7c nhi\u1EC1u l\u1EDBp \xE1o, l\u1EDBp ngo\xE0i tr\u1EA7m, l\u1EDBp trong t\u01B0\u01A1i.",
      url: "https://thethaovanhoa.vn/quan-ao-mo-bay-mo-ba-thoi-xua-20120513033913573.htm"
    },
    {
      id: "src:vusta-phu-nu-xua",
      title: "VUSTA \u2014 Trang ph\u1EE5c ph\u1EE5 n\u1EEF x\u01B0a",
      kind: "b\xE0i b\xE1o",
      note_vi: "Trang ph\u1EE5c v\xE0 m\xE0u s\u1EAFc c\u1EE7a ph\u1EE5 n\u1EEF Vi\u1EC7t x\u01B0a.",
      url: "https://vusta.vn/trang-phuc-phu-nu-xua-p74661.html"
    },
    {
      id: "src:scov-mau-sac",
      title: "scov.gov.vn \u2014 M\xE0u s\u1EAFc v\u1EDBi truy\u1EC1n th\u1ED1ng v\u0103n ho\xE1 d\xE2n t\u1ED9c",
      kind: "b\xE0i b\xE1o",
      note_vi: "\xDD ngh\u0129a m\xE0u s\u1EAFc trong v\u0103n ho\xE1 Vi\u1EC7t: s\u1EAFc vui, m\xE0u tang, m\xE0u n\u01A1i th\u1EDD t\u1EF1.",
      url: "https://scov.gov.vn/ban-sac-van-hoa/tu-dien-van-hoa/mau-sac-voi-truyen-thong-van-hoa-dan-toc.html"
    },
    {
      id: "src:artnam-dong-ho",
      title: "Artnam \u2014 M\xE0u s\u1EAFc trong tranh d\xE2n gian \u0110\xF4ng H\u1ED3",
      kind: "b\xE0i b\xE1o",
      note_vi: "N\u0103m m\xE0u t\u1EF1 nhi\xEAn c\u1EE7a tranh \u0110\xF4ng H\u1ED3.",
      url: "https://artnam.vn/mau-sac-trong-tranh-dan-gian-dong-ho/"
    },
    {
      id: "src:dsvh-dong-ho",
      title: "C\u1EE5c Di s\u1EA3n v\u0103n ho\xE1 \u2014 Tranh d\xE2n gian \u0110\xF4ng H\u1ED3",
      kind: "b\xE0i b\xE1o",
      note_vi: "Gi\u1EDBi thi\u1EC7u ngh\u1EC1 l\xE0m tranh \u0110\xF4ng H\u1ED3.",
      url: "https://dsvh.gov.vn/tranh-dan-gian-dong-ho-3151"
    }
  ],
  PART_LABELS_VI: {
    collar: "C\u1ED5 \xE1o",
    closure: "Khuy / C\xE0i",
    sleeves: "Tay \xE1o",
    hem: "T\xE0 \xE1o",
    worn_with: "M\u1EB7c c\xF9ng"
  }
};

// src/data/misc.json
var misc_default = {
  CITIES: [
    {
      id: "ha-noi",
      name: "H\xE0 N\u1ED9i",
      lat: 21.03,
      lon: 105.85,
      region: "B\u1EAFc"
    },
    {
      id: "hai-phong",
      name: "H\u1EA3i Ph\xF2ng",
      lat: 20.86,
      lon: 106.68,
      region: "B\u1EAFc"
    },
    {
      id: "hue",
      name: "Hu\u1EBF",
      lat: 16.46,
      lon: 107.59,
      region: "Trung"
    },
    {
      id: "da-nang",
      name: "\u0110\xE0 N\u1EB5ng",
      lat: 16.05,
      lon: 108.2,
      region: "Trung"
    },
    {
      id: "da-lat",
      name: "\u0110\xE0 L\u1EA1t",
      lat: 11.94,
      lon: 108.44,
      region: "Trung"
    },
    {
      id: "tp-hcm",
      name: "TP. H\u1ED3 Ch\xED Minh",
      lat: 10.78,
      lon: 106.7,
      region: "Nam"
    },
    {
      id: "can-tho",
      name: "C\u1EA7n Th\u01A1",
      lat: 10.03,
      lon: 105.78,
      region: "Nam"
    }
  ],
  SKY_NAME: {
    nang: "N\u1EAFng",
    may: "Nhi\u1EC1u m\xE2y",
    mua: "M\u01B0a",
    giong: "D\xF4ng",
    suong: "S\u01B0\u01A1ng m\xF9"
  },
  LEVELS: {
    "1": {
      level: 1,
      name: "Chu\u1EA9n c\u1ED5 ph\u1EE5c",
      remixLevel: 15,
      vibeId: "hoai-co",
      glaze: "n\u01B0\u1EDBc s\u01A1n g\u1ED7 son v\xE0ng",
      line: "Gi\u1EEF phom d\xE1ng truy\u1EC1n th\u1ED1ng, ch\u1EC9 m\u1ED9t \u0111i\u1EC3m nh\u1EA5n nh\u1ECF."
    },
    "2": {
      level: 2,
      name: "Giao thoa",
      remixLevel: 50,
      vibeId: "hoc-duong",
      glaze: "men lam Chu \u0110\u1EADu, kh\u0103n th\u1ED5 c\u1EA9m",
      line: "M\u1ED9t m\xF3n hi\u1EC7n \u0111\u1EA1i l\xE0m l\u1EDBp ph\u1ED1i, d\xE1ng \xE1o v\u1EABn nh\u1EADn ra."
    },
    "3": {
      level: 3,
      name: "\u0110\u01B0\u1EDDng ph\u1ED1",
      remixLevel: 85,
      vibeId: "duong-pho",
      glaze: "n\u01B0\u1EDBc s\u01A1n ph\u1ED1, \u0111\u1ED9i m\u0169 b\u1EA3o hi\u1EC3m",
      line: "Kho\xE1c, l\u1ED3ng \u0111\u1ED3 hi\u1EC7n \u0111\u1EA1i v\u1EDBi \xE1o; ph\u1ED1i giao thoa m\u1EA1nh tay."
    }
  }
};

// src/data/scenes.json
var scenes_default = {
  _about: "Pop-up scene layers per garment, in public/popcard/<id>/. back = backdrop 1200x900 (far layer); mid = one landmark that stands beside the doll on side `mid`; wings = two landmark halves standing either side of the doll (used instead of mid); prop = an object on the floor on side `prop`; fg = plant strip 1200x178 (nearest layer); full-nu / full-nam = the doll already dressed in this \xE1o, 1200x1600, a ready picture for covers and thumbnails.",
  scenes: {
    "ao-ba-ba": {
      wings: false,
      mid: "right",
      prop: "left",
      full: [
        "nam",
        "nu"
      ]
    },
    "ao-dai": {
      wings: true,
      mid: null,
      prop: "left",
      full: [
        "nam",
        "nu"
      ]
    },
    "ao-giao-linh": {
      wings: false,
      mid: "left",
      prop: "right",
      full: [
        "nam",
        "nu"
      ]
    },
    "ao-ngu-than": {
      wings: false,
      mid: "right",
      prop: "left",
      full: [
        "nam",
        "nu"
      ]
    },
    "ao-nhat-binh": {
      wings: true,
      mid: null,
      prop: "right",
      full: [
        "nu"
      ]
    },
    "ao-tac": {
      wings: true,
      mid: null,
      prop: "right",
      full: [
        "nam",
        "nu"
      ]
    },
    "ao-the": {
      wings: true,
      mid: null,
      prop: "left",
      full: [
        "nam"
      ]
    },
    "ao-tu-than": {
      wings: true,
      mid: null,
      prop: "left",
      full: [
        "nu"
      ]
    },
    "ao-vien-linh": {
      wings: false,
      mid: "left",
      prop: "right",
      full: [
        "nam"
      ]
    }
  }
};

// src/data/compare.json
var compare_default = {
  _about: "\u0110\u1EEBng nh\u1EA7m pairs for the 3 ready chapters. 'viet' is drawn by the doll renderer; 'other' is a picture on the same body. Every text line is copied from kb.json GARMENTS[].dont_confuse_with or structure, so it keeps that garment's sources. Hotspot x/y are fractions of the 1200x1600 doll canvas, taken from kb.json parts. A side set to null has no pair yet: show the other side's pair and say so with copy.compare.otherSide. On the Nam side the chapter's garment is doll-data NAM_OF (t\u1EE9 th\xE2n \u2192 \xE1o the, nh\u1EADt b\xECnh \u2192 \xE1o vi\xEAn l\u0129nh), so its pair and the KB line come from that garment. \xC1o b\xE0 ba has no pair yet (its look-alike, \xE1o c\xE1nh B\u1EAFc B\u1ED9, has no doll): hide the spread's chip.",
  pairs: {
    "ao-giao-linh": {
      nu: {
        otherName: "H\xE1n ph\u1EE5c",
        otherImg: "/book/compare/han-phuc-nu.webp",
        otherIsViet: false,
        box: [
          0.2358,
          0.0387,
          0.7642,
          0.9619
        ]
      },
      nam: {
        otherName: "H\xE1n ph\u1EE5c",
        otherImg: "/book/compare/han-phuc-nam.webp",
        otherIsViet: false,
        box: [
          0.2333,
          0.0387,
          0.7725,
          0.9619
        ]
      },
      line_from_kb: "dont_confuse_with[0].how_vi",
      hotspots: []
    },
    "ao-ngu-than": {
      nu: {
        otherName: "\xC1o t\u1EA5c",
        otherDoll: "ao-tac",
        otherIsViet: true,
        box: [
          0.275,
          0.0306,
          0.7267,
          0.9619
        ]
      },
      nam: {
        otherName: "\xC1o t\u1EA5c",
        otherDoll: "ao-tac",
        otherIsViet: true,
        box: [
          0.275,
          0.0387,
          0.7267,
          0.9619
        ]
      },
      line_from_kb: "dont_confuse_with[0].how_vi",
      hotspots: [
        {
          part: "sleeves",
          x: 0.28,
          y: 0.46,
          text_from_kb: "structure.sleeves"
        }
      ]
    },
    "ao-dai": {
      nu: {
        otherName: "S\u01B0\u1EDDn x\xE1m",
        otherImg: "/book/compare/suon-xam-nu.webp",
        otherIsViet: false,
        box: [
          0.275,
          0.0387,
          0.7267,
          0.9619
        ]
      },
      nam: null,
      line_from_kb: "dont_confuse_with[0].how_vi",
      hotspots: [
        {
          part: "hem",
          x: 0.5,
          y: 0.62,
          text_from_kb: "structure.hem"
        },
        {
          part: "worn_with",
          x: 0.5,
          y: 0.88,
          text_from_kb: "structure.worn_with"
        }
      ]
    },
    "ao-tac": {
      nu: {
        otherName: "\xC1o giao l\u0129nh",
        otherDoll: "ao-giao-linh",
        otherIsViet: true,
        box: [
          0.275,
          0.0262,
          0.7267,
          0.9619
        ]
      },
      nam: {
        otherName: "\xC1o giao l\u0129nh",
        otherDoll: "ao-giao-linh",
        otherIsViet: true,
        box: [
          0.2392,
          0.0387,
          0.7625,
          0.9619
        ]
      },
      line_from_kb: "dont_confuse_with[0].how_vi",
      hotspots: []
    },
    "ao-tu-than": {
      nu: {
        otherName: "\xC1o ng\u0169 th\xE2n",
        otherDoll: "ao-ngu-than",
        otherIsViet: true,
        box: [
          0.275,
          0.03,
          0.7267,
          0.9619
        ]
      },
      nam: {
        otherName: "\xC1o t\u1EA5c",
        otherDoll: "ao-tac",
        otherIsViet: true,
        box: [
          0.275,
          0.0387,
          0.7267,
          0.9619
        ]
      },
      line_from_kb: "dont_confuse_with[0].how_vi",
      hotspots: []
    },
    "ao-nhat-binh": {
      nu: {
        otherName: "\xC1o giao l\u0129nh",
        otherDoll: "ao-giao-linh",
        otherIsViet: true,
        box: [
          0.2458,
          0,
          0.755,
          0.9619
        ]
      },
      nam: {
        otherName: "\xC1o giao l\u0129nh",
        otherDoll: "ao-giao-linh",
        otherIsViet: true,
        box: [
          0.2642,
          0.0387,
          0.7367,
          0.9619
        ]
      },
      line_from_kb: "dont_confuse_with[0].how_vi",
      hotspots: []
    }
  }
};

// src/data/copy-giay.json
var copy_giay_default = {
  app: {
    name: "Ngh\xEA C\xF3t \xB7 Gi\u1EA5y",
    edition: "phi\xEAn b\u1EA3n gi\u1EA5y",
    tagline: "S\xE1ch n\u1ED5i Vi\u1EC7t ph\u1EE5c: m\u1EDF ra, k\xE9o th\u1EBB, l\u1EADt n\u1EAFp, xoay b\xE1nh gi\u1EA5y."
  },
  cover: {
    open: "M\u1EDF s\xE1ch",
    hint: "Ch\u1EA1m v\xE0o m\u1ED9t chi\u1EBFc \xE1o tr\xEAn \u0111\xE8n k\xE9o qu\xE2n \u0111\u1EC3 m\u1EDF ch\u01B0\u01A1ng c\u1EE7a n\xF3",
    skip: "V\xE0o th\u1EB3ng s\xE1ch"
  },
  chapters: {
    ready: [
      "ao-giao-linh",
      "ao-ngu-than",
      "ao-dai",
      "ao-tac",
      "ao-tu-than",
      "ao-ba-ba",
      "ao-nhat-binh"
    ],
    soonTitle: "S\u1EAFp ra m\u1EAFt",
    soonLine: "Ch\u01B0\u01A1ng n\xE0y c\xF2n \u0111ang \u0111\u01B0\u1EE3c c\u1EAFt gi\u1EA5y. Ngh\xEA h\u1EB9n b\u1EA1n l\u1EA7n sau nh\xE9!"
  },
  side: {
    label: "Ph\xE1i",
    nu: "N\u1EEF",
    nam: "Nam",
    only: "\xC1o n\xE0y ch\u1EC9 c\xF3 b\u1EA3n {side}"
  },
  spreads: {
    meet: "G\u1EB7p \xE1o",
    parts: "C\u1EA5u t\u1EA1o",
    story: "Chuy\u1EC7n \xE1o",
    compare: "\u0110\u1EEBng nh\u1EA7m",
    mix: "Ph\u1ED1i \u0111\u1ED3"
  },
  spreadPage: "Trang {n}",
  hints: {
    meet: "Di chu\u1ED9t ho\u1EB7c nghi\xEAng m\xE1y \u0111\u1EC3 nh\xECn s\xE2u v\xE0o t\u1EEBng l\u1EDBp gi\u1EA5y",
    parts: "Nh\u1EA5c m\u1EA3nh gi\u1EA5y tr\xEAn \xE1o ho\u1EB7c k\xE9o th\u1EBB \u0111\u1ECF \u0111\u1EC3 xem t\u1EEBng chi ti\u1EBFt",
    story: "Xoay b\xE1nh gi\u1EA5y \u0111\u1EC3 \u0111i qua t\u1EEBng th\u1EDDi",
    compare: "K\xE9o th\u1EBB \u0111\u1ECF \u1EDF m\xE9p s\xE1ch \u0111\u1EC3 \u0111\u1ED5i \xE1o, nh\u1EA5c t\u1EEBng m\u1EA3nh \u0111\u1EC3 so",
    mix: "Ch\u1ECDn m\xF3n trong ng\u0103n k\xE9o, xoay m\u1EB7t tr\u1ED1ng \u0111\u1EC3 \u0111\u1ED5i m\u1EE9c ph\u1ED1i"
  },
  parts: {
    pull: "K\xE9o",
    role: "Vai tr\xF2",
    detail: "Chi ti\u1EBFt",
    avoid: "Tr\xE1nh nh\u1EA7m",
    roles: {
      collar: "\u0110\u1ECBnh h\xECnh th\u1EE9c \xE1o v\xE0 v\u1EBB \u0111oan trang quanh khu\xF4n m\u1EB7t",
      closure: "Gi\u1EEF v\u1EA1t \xE1o k\xEDn \u0111\xE1o, \u0111\xFAng c\xE1ch c\xE0i c\u1EE7a t\u1EEBng lo\u1EA1i \xE1o",
      sleeves: "Cho bi\u1EBFt \xE1o d\xF9ng \u0111\u1EC3 l\xE0m vi\u1EC7c hay \u0111\u1EC3 d\u1EF1 l\u1EC5 (tay ch\u1EBDn hay tay th\u1EE5ng)",
      hem: "T\u1EA1o d\xE1ng \u0111\u1EE9ng c\u1EE7a \xE1o; s\u1ED1 th\xE2n, s\u1ED1 t\xE0 l\xE0 d\u1EA5u hi\u1EC7u nh\u1EADn ra t\u1EEBng lo\u1EA1i \xE1o",
      worn_with: "Ho\xE0n thi\u1EC7n c\u1EA3 b\u1ED9, t\u1EEB qu\u1EA7n l\u1EE5a, \xE1o l\xF3t \u0111\u1EBFn kh\u0103n \u0111\u1ED9i \u0111\u1EA7u"
    },
    avoid_text: {
      collar: "May c\u1ED5 qu\xE1 r\u1ED9ng, tr\u1EC5 n\u1EA3i, ho\u1EB7c c\xE0i v\u1EA1t ng\u01B0\u1EE3c chi\u1EC1u so v\u1EDBi \xE1o m\u1EABu",
      closure: "D\xF9ng khuy ki\u1EC3u kh\xE1c, nh\u01B0 c\xFAc t\xE0u th\u1EAFt n\xFAt, kh\xF4ng \u0111\xFAng c\xE1ch c\xE0i c\u1EE7a \xE1o",
      sleeves: "\u0110\u1ED5i tay \xE1o th\xE0nh ki\u1EC3u b\xF3 s\xE1t hi\u1EC7n \u0111\u1EA1i l\xE0m m\u1EA5t phom tay truy\u1EC1n th\u1ED1ng",
      hem: "X\u1EBB t\xE0 qu\xE1 cao l\xEAn eo (gi\u1ED1ng s\u01B0\u1EDDn x\xE1m) ho\u1EB7c c\u1EAFt t\xE0 c\u1EE5t",
      worn_with: "M\u1EB7c c\xF9ng qu\u1EA7n b\xF3 hi\u1EC7n \u0111\u1EA1i ho\u1EB7c thi\u1EBFu l\u1EDBp \xE1o l\xF3t b\xEAn trong"
    },
    lens: "K\xEDnh l\xFAp",
    lift: "Nh\u1EA5c l\xEAn",
    withSheet: "M\u1EB7c c\xF9ng",
    withHint: "Ch\u1EA1m \u0111\u1EC3 m\u1EB7c ho\u1EB7c c\u1EDFi"
  },
  story: {
    turn: "Xoay",
    source: "Ngu\u1ED3n",
    now: "H\xF4m nay"
  },
  compare: {
    pull: "K\xE9o",
    viet: "Vi\u1EC7t ph\u1EE5c",
    notViet: "Kh\xF4ng ph\u1EA3i Vi\u1EC7t ph\u1EE5c",
    diff: "Kh\xE1c \u1EDF \u0111\xE2u?",
    otherSide: "Trang n\xE0y \u0111ang d\xF9ng v\xED d\u1EE5 c\u1EE7a b\u1EA3n {side}",
    liftHint: "Nh\u1EA5c t\u1EEBng m\u1EA3nh \u0111\u1EC3 so",
    flapHint: "nh\u1EA5c \u2191"
  },
  mix: {
    drawer: "Ng\u0103n k\xE9o",
    groups: {
      over: "\xC1o kho\xE1c",
      under: "\xC1o trong",
      bottom: "Qu\u1EA7n, v\xE1y",
      feet: "Gi\xE0y d\xE9p",
      head: "Tr\xEAn \u0111\u1EA7u",
      carry: "T\xFAi",
      jewel: "Trang s\u1EE9c",
      waist: "Th\u1EAFt l\u01B0ng"
    },
    colors: "M\xE0u \xE1o",
    drum: "M\u1EB7t tr\u1ED1ng",
    reset: "M\u1EB7c l\u1EA1i t\u1EEB \u0111\u1EA7u",
    nghePick: "Ngh\xEA ph\u1ED1i gi\xFAp",
    checking: "Ngh\xEA \u0111ang ng\u1EAFm\u2026",
    offline: "Ngh\xEA \u0111ang ngh\u1EC9 m\u1EA1ng, \u0111\xE2y l\xE0 l\u1EDDi khuy\xEAn Ngh\xEA vi\u1EBFt s\u1EB5n.",
    ok: "Ph\u1ED1i \u0111\u1EB9p",
    warn: "N\xEAn xem l\u1EA1i",
    block: "Kh\xF4ng ph\u1ED1i \u0111\u01B0\u1EE3c",
    blockedTap: "M\xF3n n\xE0y che m\u1EA5t n\xE9t c\u1EE7a \xE1o, Ngh\xEA kh\xF4ng cho m\u1EB7c c\xF9ng.",
    jump: "Ph\u1ED1i ngay",
    sheet: "T\u1EDD sticker",
    wearing: "\u0111ang m\u1EB7c",
    vibes: "Gu c\u1EE7a b\u1EA1n",
    vibeHint: "Ch\u1ECDn m\u1ED9t gu, Ngh\xEA x\u1EBFp m\xF3n h\u1EE3p gu l\xEAn \u0111\u1EA7u t\u1EDD sticker",
    score: "Ngh\xEA ch\u1EA5m",
    scoreUnit: "\u0111i\u1EC3m",
    scoreLines: {
      high: "\u0110\u1EC9nh n\xF3c k\u1ECBch tr\u1EA7n! \xC1o v\u1EABn ra \xE1o, ph\u1ED1i v\u1EABn ra ph\u1ED1i.",
      mid: "\u1ED4n \xE1p \u0111\xF3! Ch\u1EC9nh th\xEAm m\u1ED9t ch\xFAt l\xE0 chu\u1EA9n b\xE0i.",
      low: "H\u01A1i l\u1EA1c tr\xF4i r\u1ED3i, n\xE9t \xE1o \u0111ang b\u1ECB che m\u1EA5t. Th\u1EED l\u1EA1i nh\xE9!"
    },
    lucky: "B\u1ED1c th\u0103m",
    luckyHint: "Ch\u1EA1m \u0111\u1EC3 Ngh\xEA g\u1EA5p m\u1EDF, d\u1EEBng \u1EDF \xF4 n\xE0o ph\u1ED1i ki\u1EC3u \u0111\xF3",
    luckyDirs: [
      "\u0110\xF4ng",
      "T\xE2y",
      "Nam",
      "B\u1EAFc"
    ],
    card: "In th\u1EBB khoe",
    cardMaking: "Ngh\xEA \u0111ang in th\u1EBB\u2026",
    cardSaved: "Th\u1EBB \u0111\xE3 l\u01B0u v\xE0o m\xE1y, khoe li\u1EC1n \u0111i!",
    cardFooter: "Ngh\xEA C\xF3t \xB7 Gi\u1EA5y",
    levelNotHere: "\xC1o n\xE0y ch\u1EC9 ph\u1ED1i \u1EDF m\u1EE9c trang tr\u1ECDng",
    zones: {
      collar: "c\u1ED5 \xE1o",
      closure: "\u0111\u01B0\u1EDDng c\xE0i",
      sleeves: "tay \xE1o",
      ta: "t\xE0 \xE1o",
      hem: "g\u1EA5u \xE1o",
      waist: "th\u1EAFt l\u01B0ng",
      inner: "l\u1EDBp \xE1o trong"
    },
    issues: {
      R1: "{piece} \u0111ang che {zone}, n\xE9t ri\xEAng c\u1EE7a \xE1o b\u1ECB m\u1EA5t.",
      R2: "M\u1EE9c {level} m\xE0 nhi\u1EC1u m\xF3n hi\u1EC7n \u0111\u1EA1i qu\xE1, b\u1EDBt m\u1ED9t m\xF3n nh\xE9.",
      R4: "\xC1o tay th\u1EE5ng kh\xF4ng kho\xE1c th\xEAm \xE1o ngo\xE0i \u0111\u01B0\u1EE3c, tay \xE1o s\u1EBD b\u1ECB \u0111\xE8.",
      R5skirt: "Ch\xE2n v\xE1y ch\u1EC9 h\u1EE3p v\u1EDBi \xE1o t\u1EE9 th\xE2n ho\u1EB7c \xE1o b\xE0 ba.",
      R5robe: "\xC1o l\u1EC5 ph\u1EE5c n\xEAn gi\u1EEF qu\u1EA7n, v\xE1y truy\u1EC1n th\u1ED1ng \u0111i k\xE8m.",
      R3: "\xC1o kho\xE1c l\u1EEDng gi\u1EEFa ch\u1EEBng s\u1EBD c\u1EAFt ngang t\xE0 \xE1o. Ch\u1ECDn l\u1EDBp ng\u1EAFn ho\u1EB7c d\xE0i h\u1EB3n nh\xE9.",
      R6: "\xC1o l\u1EC5 ph\u1EE5c n\xE0y hi\u1EBFm khi ph\u1ED1i \u1EDF m\u1EE9c {level}, d\u1EC5 b\u1ECB hi\u1EC3u l\u1EC7ch n\xE9t \xE1o."
    },
    stars: {
      hon: "Gi\u1EEF h\u1ED3n \xE1o",
      mau: "H\u1EE3p m\xE0u",
      mix: "D\xE1m mix"
    },
    worldHint: {
      here: {
        "1": "Chu\u1EA9n c\u1ED5 ph\u1EE5c",
        "2": "Giao thoa",
        "3": "\u0110\u01B0\u1EDDng ph\u1ED1"
      },
      lines: {
        "1": "B\u1ED9 n\xE0y h\u01A1i l\u1EA1c \u1EDF {from} ({fromScore}). Qua **Chu\u1EA9n c\u1ED5 ph\u1EE5c** n\xF3 \u0111\u01B0\u1EE3c **{toScore}** \u0111i\u1EC3m \u0111\xF3!",
        "2": "B\u1ED9 n\xE0y ch\u01B0a t\u1EDBi \u1EDF {from} ({fromScore}). Qua **Giao thoa** n\xF3 \u0111\u01B0\u1EE3c **{toScore}** \u0111i\u1EC3m n\xE8!",
        "3": "B\u1ED9 n\xE0y ch\u01B0a h\u1EE3p \u1EDF {from} ({fromScore}). Qua **\u0110\u01B0\u1EDDng ph\u1ED1** n\xF3 l\xEAn **{toScore}** \u0111i\u1EC3m lu\xF4n!"
      },
      go: "Qua xem",
      close: "\u0110\u1EC3 sau"
    },
    recolor: {
      title: "\u0110\u1ED5i m\xE0u m\xF3n \u0111\u1ED3",
      for: "M\xF3n",
      reset: "M\xE0u g\u1ED1c",
      suggest: "Ngh\xEA g\u1EE3i \xFD m\xE0u",
      suggestSay: "Ngh\xEA \u0111\xE3 ch\u1ECDn m\xE0u h\u1EE3p v\u1EDBi \xE1o, xem th\u1EED nh\xE9!",
      empty: "M\u1EB7c th\xEAm m\xF3n hi\u1EC7n \u0111\u1EA1i \u0111\u1EC3 \u0111\u1ED5i m\xE0u cho n\xF3.",
      best: "H\u1EE3p nh\u1EA5t"
    },
    almost: "G\u1EA7n \u0111\u01B0\u1EE3c r\u1ED3i"
  },
  nghe: {
    hello: "Ngh\xEA ch\xE0o b\u1EA1n! Ngh\xEA c\u0169ng l\xE0m b\u1EB1ng gi\u1EA5y, l\u1EADt trang n\xE0o Ngh\xEA theo trang \u0111\xF3.",
    idle: [
      "K\xE9o th\u1EED c\xE1i th\u1EBB \u0111\u1ECF kia xem!",
      "Ngh\xEA th\xEDch nghe ti\u1EBFng gi\u1EA5y s\u1ED9t so\u1EA1t.",
      "M\u1ED7i chi\u1EBFc \xE1o c\xF3 m\u1ED9t c\xE2u chuy\u1EC7n, Ngh\xEA k\u1EC3 cho nghe nh\xE9?"
    ]
  },
  back: {
    title: "B\u1EA3n 3D \u0111ang ph\xE1t tri\u1EC3n",
    line: "Ngh\xEA C\xF3t c\xF2n m\u1ED9t x\u01B0\u1EDFng 3D: Ngh\xEA l\xEAn d\xE2y c\xF3t v\xE0 in Th\u1EBB M\u1ED9c tr\xEAn b\xE0n g\u1ED7. B\u1EA3n \u0111\xF3 v\u1EABn \u0111ang \u0111\u01B0\u1EE3c l\xE0m ti\u1EBFp.",
    pin: "\u1EA2nh ch\u1EE5p b\u1EA3n 3D"
  },
  settings: {
    sound: "Ti\u1EBFng gi\u1EA5y",
    motion: "Gi\u1EA3m chuy\u1EC3n \u0111\u1ED9ng"
  },
  a11y: {
    prev: "Trang tr\u01B0\u1EDBc",
    next: "Trang sau",
    close: "G\u1EADp s\xE1ch",
    chapter: "Ch\u01B0\u01A1ng {name}"
  },
  system: {
    loading: "Ngh\xEA \u0111ang g\u1EA5p gi\u1EA5y\u2026",
    tiltAsk: "Cho ph\xE9p nghi\xEAng m\xE1y \u0111\u1EC3 nh\xECn s\xE2u v\xE0o trang gi\u1EA5y",
    tiltOn: "Nghi\xEAng m\xE1y \u0111\u1EC3 nh\xECn s\xE2u h\u01A1n",
    artMissing: "H\xECnh n\xE0y ch\u01B0a c\xF3",
    rotate: "Xoay d\u1ECDc m\xE1y \u0111\u1EC3 \u0111\u1ECDc s\xE1ch nh\xE9"
  },
  meet: {
    aka: "c\xF2n g\u1ECDi",
    tags: "Nh\u1EADn ra ngay",
    occ: "M\u1EB7c \u0111i \u0111\xE2u?",
    ok: "H\u1EE3p",
    caution: "C\xE2n nh\u1EAFc",
    cta: "Ph\u1ED1i \u0111\u1ED3 \xE1o n\xE0y \u2192",
    sources: "Ngu\u1ED3n",
    replay: "G\u1EADp / m\u1EDF l\u1EA1i"
  },
  chat: {
    open: "H\u1ECFi Ngh\xEA",
    title: "S\u1ED5 tay c\u1EE7a Ngh\xEA",
    placeholder: "H\u1ECFi Ngh\xEA v\u1EC1 chi\u1EBFc \xE1o n\xE0y\u2026",
    send: "G\u1EEDi",
    suggest: {
      where: "\xC1o n\xE0y m\u1EB7c \u0111i \u0111\xE2u?",
      story: "K\u1EC3 chuy\u1EC7n \xE1o n\xE0y \u0111i",
      mix: "Ph\u1ED1i gi\xFAp Ngh\xEA m\u1ED9t b\u1ED9"
    },
    acted: "Ngh\xEA \u0111\xE3 m\u1EB7c th\xEAm: {piece}",
    thinking: "Ngh\xEA \u0111ang l\u1EADt s\xE1ch\u2026",
    offline: "Ngh\xEA \u0111ang ngh\u1EC9 m\u1EA1ng, th\u1EED l\u1EA1i sau nh\xE9.",
    close: "G\u1EADp s\u1ED5"
  },
  photo: {
    button: "Nh\u1EDD Ngh\xEA ch\u1EE5p",
    needKey: "Ngh\xEA c\u1EA7n ch\xECa kho\xE1 Gemini c\xF3 tr\u1EA3 ph\xED c\u1EE7a b\u1EA1n \u0111\u1EC3 ch\u1EE5p \u1EA3nh. Tr\xF2 chuy\u1EC7n th\xEC kh\xF4ng c\u1EA7n.",
    making: "Ngh\xEA \u0111ang ch\u1EE5p\u2026",
    done: "\u1EA2nh c\u1EE7a b\u1EA1n \u0111\xE2y!",
    save: "L\u01B0u \u1EA3nh",
    toCard: "\u0110\u01B0a l\xEAn th\u1EBB khoe",
    fallback: "Ch\u01B0a c\xF3 ch\xECa kho\xE1: \u0111\xE2y l\xE0 th\u1EBB b\xFAp b\xEA c\u1EE7a b\u1EA1n.",
    fail: "Ngh\xEA ch\u1EE5p ch\u01B0a \u0111\u01B0\u1EE3c: {why}",
    why: {
      key: "ch\xECa kho\xE1 kh\xF4ng d\xF9ng \u0111\u01B0\u1EE3c",
      quota: "h\u1EBFt l\u01B0\u1EE3t, th\u1EED l\u1EA1i sau",
      net: "m\u1EA1ng ch\u1EADp ch\u1EDDn"
    }
  },
  key: {
    title: "Ch\xECa kho\xE1 Gemini",
    label: "D\xE1n ch\xECa kho\xE1 API c\u1EE7a b\u1EA1n",
    note: "Ch\xECa kho\xE1 \u0111i th\u1EB3ng t\u1EEB tr\xECnh duy\u1EC7t t\u1EDBi Google, kh\xF4ng qua m\xE1y ch\u1EE7 c\u1EE7a app, v\xE0 b\u1ECB qu\xEAn khi b\u1EA1n \u0111\xF3ng tab.",
    use: "D\xF9ng ch\xECa kho\xE1 n\xE0y",
    remove: "B\u1ECF ch\xECa kho\xE1",
    have: "\u0110ang d\xF9ng ch\xECa kho\xE1 c\u1EE7a b\u1EA1n"
  }
};

// src/data/doll-data.json
var doll_data_default = {
  TRAD_PIECES: [
    {
      id: "quan-lua",
      name: "Qu\u1EA7n l\u1EE5a tr\u1EAFng",
      note_vi: "Qu\u1EA7n l\u1EE5a tr\u1EAFng \u1ED1ng r\u1ED9ng truy\u1EC1n th\u1ED1ng, m\u1EB7c c\xF9ng \xE1o d\xE0i, \xE1o ng\u0169 th\xE2n, \xE1o t\u1EA5c."
    },
    {
      id: "quan-den",
      name: "Qu\u1EA7n \u0111en",
      note_vi: "Qu\u1EA7n \u0111en \u1ED1ng r\u1ED9ng truy\u1EC1n th\u1ED1ng Nam B\u1ED9, m\u1EB7c c\xF9ng \xE1o b\xE0 ba."
    },
    {
      id: "vay-den",
      name: "V\xE1y \u0111\u1EE5p \u0111en",
      note_vi: "V\xE1y \u0111\u1EE5p \u0111en d\xE0i ch\u1EA5m g\xF3t, l\u1EDBp n\u1EC1n b\xEAn trong c\u1EE7a \xE1o t\u1EE9 th\xE2n B\u1EAFc B\u1ED9."
    },
    {
      id: "xiem",
      name: "Xi\xEAm",
      note_vi: "Xi\xEAm qu\xE2y l\u1EE5a ph\u1EE7 ngo\xE0i qu\u1EA7n ho\u1EB7c m\u1EB7c trong \xE1o Nh\u1EADt B\xECnh, giao l\u0129nh."
    },
    {
      id: "yem",
      name: "Y\u1EBFm \u0111\xE0o",
      note_vi: "\xC1o y\u1EBFm l\xF3t che ng\u1EF1c c\u1ED5 truy\u1EC1n, m\u1EB7c b\xEAn trong \xE1o t\u1EE9 th\xE2n."
    },
    {
      id: "that-lung",
      name: "Th\u1EAFt l\u01B0ng l\u1EE5a",
      note_vi: "D\u1EA3i l\u1EE5a m\u1EC1m bu\u1ED9c ngang eo gi\u1EEF v\u1EA1t \xE1o, bu\xF4ng hai m\xFAi tr\u01B0\u1EDBc b\u1EE5ng."
    },
    {
      id: "ao-lot-trang",
      name: "\xC1o l\xF3t tr\u1EAFng",
      note_vi: "\xC1o l\xF3t tr\u1EAFng c\u1ED5 \u0111\u1EE9ng m\u1EB7c b\xEAn trong \xE1o ng\u0169 th\xE2n, \xE1o the."
    },
    {
      id: "ao-lot-giao",
      name: "\xC1o l\xF3t giao l\u0129nh",
      note_vi: "\xC1o l\xF3t c\u1ED5 ch\xE9o m\xE0u tr\u1EAFng m\u1EB7c b\xEAn trong \xE1o giao l\u0129nh."
    },
    {
      id: "ao-dai-lot",
      name: "\xC1o d\xE0i l\xF3t",
      note_vi: "\xC1o d\xE0i l\xF3t c\u1ED5 \u0111\u1EE9ng m\u1EB7c b\xEAn trong \xE1o Nh\u1EADt B\xECnh."
    },
    {
      id: "khan-vanh",
      name: "Kh\u0103n v\xE0nh",
      note_vi: "Kh\u0103n v\xE0nh d\xE2y qu\u1EA5n nhi\u1EC1u v\xF2ng quanh \u0111\u1EA7u c\u1EE7a ho\xE0ng t\u1ED9c, m\u1EC7nh ph\u1EE5 tri\u1EC1u Nguy\u1EC5n."
    }
  ],
  COMPANIONS: {
    nu: {
      "ao-dai": [
        "quan-lua"
      ],
      "ao-ngu-than": [
        "quan-lua",
        "khan-van"
      ],
      "ao-tac": [
        "quan-lua",
        "khan-van"
      ],
      "ao-tu-than": [
        "vay-den",
        "yem",
        "that-lung",
        "khan-mo-qua"
      ],
      "ao-ba-ba": [
        "quan-den",
        "khan-ran"
      ],
      "ao-nhat-binh": [
        "xiem",
        "ao-dai-lot",
        "khan-vanh"
      ],
      "ao-giao-linh": [
        "xiem",
        "ao-lot-giao"
      ],
      "ao-the": [
        "quan-lua",
        "ao-lot-trang",
        "khan-van"
      ],
      "ao-vien-linh": [
        "quan-lua"
      ]
    },
    nam: {
      "ao-dai": [
        "quan-lua"
      ],
      "ao-ngu-than": [
        "quan-lua",
        "khan-xep"
      ],
      "ao-tac": [
        "quan-lua",
        "khan-xep"
      ],
      "ao-the": [
        "quan-lua",
        "ao-lot-trang",
        "khan-xep"
      ],
      "ao-tu-than": [
        "quan-lua",
        "ao-lot-trang",
        "khan-xep"
      ],
      "ao-ba-ba": [
        "quan-den",
        "khan-ran"
      ],
      "ao-vien-linh": [
        "quan-lua"
      ],
      "ao-nhat-binh": [
        "quan-lua"
      ],
      "ao-giao-linh": [
        "quan-lua",
        "ao-lot-giao"
      ]
    }
  },
  PIECE_SIDE: {
    "ao-croptop": "nu",
    "chan-vay-xep-ly": "nu",
    "chan-vay-bo": "nu",
    "khan-van": "nu",
    "khan-mo-qua": "nu",
    "non-quai-thao": "nu",
    "tram-cai-toc": "nu",
    "khuyen-ngoc": "nu",
    "vay-den": "nu",
    yem: "nu",
    "khan-vanh": "nu",
    "khan-xep": "nam",
    "ao-the": "nam",
    "ao-vien-linh": "nam",
    "ao-khoac-bo": "both",
    "ao-vest": "both",
    "ao-ni-mu": "both",
    "ao-len-cai-cuc": "both",
    "ao-bomber": "both",
    "ao-varsity": "both",
    "ao-khoac-da": "both",
    "ao-mang-to": "both",
    "so-mi-oversize": "both",
    "ao-thun-trang": "both",
    "ao-co-lo": "both",
    "quan-bo-ong-rong": "both",
    "quan-tay": "both",
    "quan-cargo": "both",
    "quan-ong-loe": "both",
    "giay-luoi": "both",
    "bot-co-cao": "both",
    "giay-cao-co": "both",
    "giay-de-tho": "both",
    "giay-bup-be": "both",
    "mu-luoi-trai": "both",
    "mu-tai-beo": "both",
    "mu-beret": "both",
    "mu-len": "both",
    "tai-nghe": "both",
    "tui-deo-cheo": "both",
    balo: "both",
    "tui-bao-tu": "both",
    "that-lung-ban-to": "both",
    "non-la": "both",
    "khan-ran": "both",
    "guoc-moc": "both",
    "hai-theu": "both",
    "giay-the-thao": "both",
    "tui-vai": "both",
    "kinh-mat": "both",
    "vong-co": "both",
    "quat-giay": "both",
    "vong-tay-bac": "both",
    "thao-dai": "both",
    "o-giay": "both",
    "quan-lua": "both",
    "quan-den": "both",
    xiem: "both",
    "that-lung": "both",
    "ao-lot-trang": "both",
    "ao-lot-giao": "both",
    "ao-dai-lot": "both",
    "ao-dai": "both",
    "ao-ngu-than": "both",
    "ao-tac": "both",
    "ao-tu-than": "nu",
    "ao-ba-ba": "both",
    "ao-nhat-binh": "nu",
    "ao-giao-linh": "both"
  },
  NAM_OF: {
    "ao-tu-than": "ao-the",
    "ao-nhat-binh": "ao-vien-linh",
    "ao-dai": "ao-dai",
    "ao-ngu-than": "ao-ngu-than",
    "ao-tac": "ao-tac",
    "ao-ba-ba": "ao-ba-ba",
    "ao-giao-linh": "ao-giao-linh",
    "ao-the": "ao-the",
    "ao-vien-linh": "ao-vien-linh"
  }
};

// src/data/hang-trong.json
var hang_trong_default = {
  note: "H\xE0ng Tr\u1ED1ng papers behind the book. Motifs are original drawings in the spirit of H\xE0ng Tr\u1ED1ng prints, not copies of any artwork. byChapter = the paper for each chapter; byVibe = the paper in Ph\u1ED1i \u0111\u1ED3 once a gu is picked (no gu = the chapter paper).",
  papers: {
    "ht-may-luc": {
      label: "M\xE2y h\u1ED3ng n\u1EC1n l\u1EE5c (in tay)",
      src: "/book/tex/ht-may-luc.webp",
      mode: "cover",
      tile: null,
      base: "#4CA292",
      light: false,
      made: "banana"
    },
    "ht-may-hong": {
      label: "M\xE2y l\u1EE5c n\u1EC1n h\u1ED3ng (in tay)",
      src: "/book/tex/ht-may-hong.webp",
      mode: "cover",
      tile: null,
      base: "#DE425B",
      light: false,
      made: "banana"
    },
    "ht-tho-son": {
      label: "Th\u1ECD v\xE0ng n\u1EC1n son (in tay)",
      src: "/book/tex/ht-tho-son.webp",
      mode: "tile",
      tile: 760,
      base: "#981E16",
      light: false,
      made: "banana"
    },
    "ht-tho-cham": {
      label: "Chu\u1ED7i Th\u1ECD n\u1EC1n ch\xE0m (in tay)",
      src: "/book/tex/ht-tho-cham.webp",
      mode: "tile",
      tile: 760,
      base: "#85404B",
      light: false,
      made: "banana"
    },
    "ht-xoay-cam": {
      label: "Xo\xE1y n\u1EC1n cam (in tay)",
      src: "/book/tex/ht-xoay-cam.webp",
      mode: "tile",
      tile: 760,
      base: "#EA801F",
      light: false,
      made: "banana"
    },
    "ht-song-tim": {
      label: "S\xF3ng n\u1EC1n t\xEDm than (in tay)",
      src: "/book/tex/ht-song-tim.webp",
      mode: "tile",
      tile: 760,
      base: "#211A44",
      light: false,
      made: "banana"
    },
    "ht-ca-chep": {
      label: "C\xE1 ch\xE9p tr\xF4ng tr\u0103ng (in tay)",
      src: "/book/tex/ht-ca-chep.webp",
      mode: "cover",
      tile: null,
      base: "#08556C",
      light: false,
      made: "banana"
    },
    "ht-hoa-hong": {
      label: "Sen, m\u1EABu \u0111\u01A1n n\u1EC1n h\u1ED3ng (in tay)",
      src: "/book/tex/ht-hoa-hong.webp",
      mode: "tile",
      tile: 760,
      base: "#DB8885",
      light: true,
      made: "banana"
    },
    "ht-ho-vang": {
      label: "H\u1ED5 con n\u1EC1n v\xE0ng (in tay)",
      src: "/book/tex/ht-ho-vang.webp",
      mode: "tile",
      tile: 760,
      base: "#E9AB21",
      light: true,
      made: "banana"
    },
    "ht-hac-cham": {
      label: "H\u1EA1c v\xE0 m\xE2y n\u1EC1n ch\xE0m (in tay)",
      src: "/book/tex/ht-hac-cham.webp",
      mode: "tile",
      tile: 760,
      base: "#2B4B68",
      light: false,
      made: "banana"
    },
    "htc-may-luc": {
      label: "M\xE2y h\u1ED3ng n\u1EC1n l\u1EE5c",
      src: "/book/tex/htc-may-luc.webp",
      mode: "tile",
      tile: 760,
      base: "#3C9D8D",
      light: false,
      made: "code"
    },
    "htc-may-hong": {
      label: "M\xE2y l\u1EE5c n\u1EC1n h\u1ED3ng",
      src: "/book/tex/htc-may-hong.webp",
      mode: "tile",
      tile: 760,
      base: "#E0536B",
      light: false,
      made: "code"
    },
    "htc-may-cham": {
      label: "M\xE2y kem n\u1EC1n ch\xE0m",
      src: "/book/tex/htc-may-cham.webp",
      mode: "tile",
      tile: 760,
      base: "#3A5A8B",
      light: false,
      made: "code"
    },
    "htc-tho-son": {
      label: "Th\u1ECD v\xE0ng n\u1EC1n son",
      src: "/book/tex/htc-tho-son.webp",
      mode: "tile",
      tile: 760,
      base: "#A1221E",
      light: false,
      made: "code"
    },
    "htc-tho-cham": {
      label: "Chu\u1ED7i Th\u1ECD n\u1EC1n ch\xE0m",
      src: "/book/tex/htc-tho-cham.webp",
      mode: "tile",
      tile: 760,
      base: "#242A65",
      light: false,
      made: "code"
    },
    "htc-tho-luc": {
      label: "Th\u1ECD tr\xF2n n\u1EC1n l\u1EE5c",
      src: "/book/tex/htc-tho-luc.webp",
      mode: "tile",
      tile: 760,
      base: "#1D795A",
      light: false,
      made: "code"
    },
    "htc-xoay-cam": {
      label: "Xo\xE1y n\u1EC1n cam",
      src: "/book/tex/htc-xoay-cam.webp",
      mode: "tile",
      tile: 760,
      base: "#EB6A1E",
      light: false,
      made: "code"
    },
    "htc-xoay-tim": {
      label: "Hoa xo\xE1y n\u1EC1n t\xEDm",
      src: "/book/tex/htc-xoay-tim.webp",
      mode: "tile",
      tile: 760,
      base: "#392457",
      light: false,
      made: "code"
    },
    "htc-song-tim": {
      label: "S\xF3ng n\u1EC1n t\xEDm than",
      src: "/book/tex/htc-song-tim.webp",
      mode: "tile",
      tile: 760,
      base: "#857B8D",
      light: false,
      made: "code"
    },
    "htc-ca-chep": {
      label: "C\xE1 ch\xE9p tr\xF4ng tr\u0103ng",
      src: "/book/tex/htc-ca-chep.webp",
      mode: "tile",
      tile: 760,
      base: "#3D9D8D",
      light: false,
      made: "code"
    },
    "htc-sen-phan": {
      label: "Sen n\u1EC1n h\u1ED3ng ph\u1EA5n",
      src: "/book/tex/htc-sen-phan.webp",
      mode: "tile",
      tile: 760,
      base: "#EAAAA3",
      light: true,
      made: "code"
    },
    "htc-hoa-do": {
      label: "Hoa n\u1EC1n \u0111\u1ECF",
      src: "/book/tex/htc-hoa-do.webp",
      mode: "tile",
      tile: 760,
      base: "#C7342D",
      light: false,
      made: "code"
    },
    "htc-ho-vang": {
      label: "H\u1ED5 con n\u1EC1n v\xE0ng",
      src: "/book/tex/htc-ho-vang.webp",
      mode: "tile",
      tile: 760,
      base: "#F3B728",
      light: true,
      made: "code"
    },
    "htc-hac-cham": {
      label: "H\u1EA1c v\xE0 m\xE2y n\u1EC1n ch\xE0m",
      src: "/book/tex/htc-hac-cham.webp",
      mode: "tile",
      tile: 760,
      base: "#3A5A8B",
      light: false,
      made: "code"
    },
    "htc-qua-hong": {
      label: "Qu\u1EA3 l\xE0nh",
      src: "/book/tex/htc-qua-hong.webp",
      mode: "tile",
      tile: 760,
      base: "#9DD0C2",
      light: true,
      made: "code"
    },
    "htc-rong-son": {
      label: "R\u1ED3ng th\u1EDDi L\xFD n\u1EC1n son",
      src: "/book/tex/htc-rong-son.webp",
      mode: "tile",
      tile: 760,
      base: "#A2231E",
      light: false,
      made: "code"
    },
    "htc-gam-hong": {
      label: "G\u1EA5m nh\u1ECF n\u1EC1n h\u1ED3ng",
      src: "/book/tex/htc-gam-hong.webp",
      mode: "tile",
      tile: 760,
      base: "#E1536B",
      light: false,
      made: "code"
    }
  },
  byChapter: {
    "ao-giao-linh": "htc-rong-son",
    "ao-ngu-than": "htc-tho-cham",
    "ao-dai": "ht-may-luc",
    "ao-tac": "htc-tho-luc",
    "ao-tu-than": "ht-ca-chep",
    "ao-ba-ba": "htc-sen-phan",
    "ao-nhat-binh": "ht-hac-cham"
  },
  byVibe: {
    "duong-pho": "htc-ho-vang",
    "toi-gian": "htc-may-cham",
    "hoai-co": "ht-tho-son",
    "hoc-duong": "htc-xoay-tim",
    "le-hoi": "ht-xoay-cam",
    "moc-mac": "htc-qua-hong"
  },
  gam: [
    {
      id: "tho-cuc",
      label: "Th\u1ECD & c\xFAc",
      src: "/book/tex/gam-tho-cuc.webp"
    },
    {
      id: "doi-tho",
      label: "D\u01A1i & Th\u1ECD",
      src: "/book/tex/gam-doi-tho.webp"
    },
    {
      id: "trien",
      label: "Tri\u1EC7n",
      src: "/book/tex/gam-trien.webp"
    },
    {
      id: "may",
      label: "M\xE2y",
      src: "/book/tex/gam-may.webp"
    }
  ],
  copy: {
    paperTag: "Gi\u1EA5y l\xF3t: {name}",
    paperFrom: "ho\u1EA1 ti\u1EBFt theo l\u1ED1i tranh H\xE0ng Tr\u1ED1ng",
    paperAuto: "t\u1EF1 \u0111\u1ED5i",
    paperPick: "gi\u1EA5y",
    material: "Ch\u1EA5t li\u1EC7u",
    plain: "Tr\u01A1n",
    gamSay: "G\u1EA5m hoa v\u0103n ch\xECm: hoa v\u0103n c\xF9ng m\xE0u v\u1EDBi v\u1EA3i, ch\u1EC9 hi\u1EC7n ra khi \xE1nh s\xE1ng l\u01B0\u1EDBt qua. R\xEA chu\u1ED9t quanh \xE1o xem nh\xE9!",
    weaveBtn: "\u0110an kh\u0103n r\u1EB1n",
    weaveTitle: "\u0110an kh\u0103n r\u1EB1n",
    weaveNote: "Kh\u0103n r\u1EB1n Nam B\u1ED9 c\xF3 \xF4 caro, th\u01B0\u1EDDng \u0111en v\xE0 tr\u1EAFng. \u1EDE \u0111\xE2y m\xECnh \u0111an b\u1EB1ng nan gi\u1EA5y: ch\u1ECDn m\xE0u nan, b\u1EA5m v\xE0o m\u1ED9t h\xE0ng \u0111\u1EC3 lu\u1ED3n nan v\xE0o.",
    weaveOne: "Nong m\u1ED1t",
    weaveTwo: "Nong \u0111\xF4i",
    weaveClear: "G\u1EE1 h\u1EBFt nan",
    weaveWear: "\u0110eo kh\u0103n",
    weaveClose: "C\u1EA5t khung",
    weaveSay: "Kh\u0103n t\u1EF1 \u0111an \u0111\xE2y! \xD4 caro hi\u1EC7n ra t\u1EEB ch\u1ED7 nan n\u1EB1m tr\xEAn v\xE0 n\u1EB1m d\u01B0\u1EDBi t\u1EA5m khung.",
    strips: {
      den: "\u0111en",
      trang: "tr\u1EAFng",
      cham: "ch\xE0m",
      son: "\u0111\u1ECF son",
      luc: "l\u1EE5c",
      vang: "v\xE0ng",
      hong: "h\u1ED3ng",
      kraft: "n\xE2u gi\u1EA5y"
    }
  },
  weave: {
    card: "/book/weave/card.webp",
    strips: [
      {
        id: "den",
        src: "/book/weave/strips/den.webp",
        rgb: [
          36,
          43,
          51
        ]
      },
      {
        id: "trang",
        src: "/book/weave/strips/trang.webp",
        rgb: [
          234,
          231,
          224
        ]
      },
      {
        id: "cham",
        src: "/book/weave/strips/cham.webp",
        rgb: [
          44,
          109,
          151
        ]
      },
      {
        id: "son",
        src: "/book/weave/strips/son.webp",
        rgb: [
          184,
          67,
          54
        ]
      },
      {
        id: "luc",
        src: "/book/weave/strips/luc.webp",
        rgb: [
          147,
          175,
          135
        ]
      },
      {
        id: "vang",
        src: "/book/weave/strips/vang.webp",
        rgb: [
          229,
          176,
          60
        ]
      },
      {
        id: "hong",
        src: "/book/weave/strips/hong.webp",
        rgb: [
          187,
          84,
          100
        ]
      },
      {
        id: "kraft",
        src: "/book/weave/strips/kraft.webp",
        rgb: [
          167,
          130,
          97
        ]
      }
    ],
    target: "khan-ran",
    geo: {
      size: 860,
      slits: [
        [
          92,
          112
        ],
        [
          173,
          195
        ],
        [
          256,
          277
        ],
        [
          339,
          359
        ],
        [
          420,
          441
        ],
        [
          501,
          522
        ],
        [
          583,
          604
        ],
        [
          666,
          687
        ],
        [
          748,
          770
        ]
      ],
      top: 100,
      bottom: 762,
      rows: 9
    }
  }
};

// src/data/index.ts
var GARMENTS = kb_default.GARMENTS;
var COLORS = kb_default.COLORS;
var MODERN_PIECES = kb_default.MODERN_PIECES;
var ACCESSORIES = kb_default.ACCESSORIES;
var VIBES = kb_default.VIBES;
var OCCASIONS = kb_default.OCCASIONS;
var SOURCES = kb_default.SOURCES;
var PART_LABELS_VI = kb_default.PART_LABELS_VI;
var LEVELS = misc_default.LEVELS;
var SCENES = scenes_default.scenes;
var COMPARE = compare_default.pairs;
var COPY = copy_giay_default;
var TRAD_PIECES = doll_data_default.TRAD_PIECES;
var COMPANIONS = doll_data_default.COMPANIONS;
var NAM_OF = doll_data_default.NAM_OF;
var HANG_TRONG = hang_trong_default;
var HT_COPY = HANG_TRONG.copy;
var garmentsMap = new Map(GARMENTS.map((g) => [g.id, g]));
var colorsMap = new Map(COLORS.map((c) => [c.id, c]));
var modernMap = new Map(MODERN_PIECES.map((m) => [m.id, m]));
var accessoriesMap = new Map(ACCESSORIES.map((a) => [a.id, a]));
var tradMap = new Map(TRAD_PIECES.map((t) => [t.id, t]));
var sourcesMap = new Map(SOURCES.map((s) => [s.id, s]));
var vibesMap = new Map(VIBES.map((v) => [v.id, v]));
function pieceName(id) {
  return modernMap.get(id)?.name ?? accessoriesMap.get(id)?.name ?? tradMap.get(id)?.name;
}
var READY = COPY.chapters.ready;
function gidOf(chapter, side) {
  if (side === "nam") {
    return NAM_OF[chapter] ?? chapter;
  }
  return chapter;
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
app.use(express.json());
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var SYSTEM_INSTRUCTION = "B\u1EA1n l\xE0 Ngh\xEA, m\u1ED9t ch\xFA ngh\xEA gi\u1EA5y nh\u1ECF, n\xF3i v\u1EC1 m\xECnh l\xE0 'Ngh\xEA'. B\u1EA1n ch\u1EA5m b\u1ED9 ph\u1ED1i Vi\u1EC7t ph\u1EE5c cho b\u1EA1n tr\u1EBB. Vi\u1EBFt \u0111\xFAng M\u1ED8T c\xE2u ti\u1EBFng Vi\u1EC7t, t\u1ED1i \u0111a 25 ch\u1EEF, gi\u1ECDng Gen Z vui, th\xE2n thi\u1EC7n, c\xF3 th\u1EC3 d\xF9ng ti\u1EBFng l\xF3ng ti\u1EBFng Vi\u1EC7t (v\xED d\u1EE5: \u0111\u1EC9nh n\xF3c, \u1ED5n \xE1p, chu\u1EA9n b\xE0i, keo l\xEC) nh\u01B0ng kh\xF4ng d\xF9ng t\u1EEB ti\u1EBFng Anh, kh\xF4ng ch\xEA bai ng\u01B0\u1EDDi m\u1EB7c. Ch\u1EC9 n\xF3i v\u1EC1 nh\u1EEFng m\xF3n v\xE0 l\u1ED7i \u0111\u01B0\u1EE3c \u0111\u01B0a v\xE0o; kh\xF4ng t\u1EF1 th\xEAm ki\u1EBFn th\u1EE9c l\u1ECBch s\u1EED. N\u1EBFu c\xF3 l\u1ED7i, g\u1EE3i \xFD m\u1ED9t c\xE1ch s\u1EEDa. N\u1EBFu c\xF3 'tips' v\u1EC1 m\xE0u, c\xF3 th\u1EC3 nh\u1EAFc m\u1ED9t tip b\u1EB1ng l\u1EDDi c\u1EE7a b\u1EA1n; 'stars' l\xE0 ba \u0111i\u1EC3m th\xE0nh ph\u1EA7n, h\xE3y khen \u0111i\u1EC3m cao nh\u1EA5t.";
var CHAT_SYSTEM_INSTRUCTION = "B\u1EA1n l\xE0 Ngh\xEA, m\u1ED9t ch\xFA ngh\xEA gi\u1EA5y nh\u1ECF trong cu\u1ED1n s\xE1ch pop-up v\u1EC1 Vi\u1EC7t ph\u1EE5c, n\xF3i v\u1EC1 m\xECnh l\xE0 'Ngh\xEA'. Tr\u1EA3 l\u1EDDi b\u1EB1ng ti\u1EBFng Vi\u1EC7t, gi\u1ECDng Gen Z vui v\xE0 th\xE2n thi\u1EC7n, t\u1ED1i \u0111a 60 ch\u1EEF. Ch\u1EC9 d\xF9ng ki\u1EBFn th\u1EE9c trong ph\u1EA7n D\u1EEE LI\u1EC6U \u0111\u01B0\u1EE3c \u0111\u01B0a v\xE0o; n\u1EBFu d\u1EEF li\u1EC7u kh\xF4ng c\xF3, n\xF3i th\u1EADt l\xE0 Ngh\xEA ch\u01B0a bi\u1EBFt v\xE0 g\u1EE3i \xFD m\u1ED9t c\xE2u h\u1ECFi kh\xE1c. Kh\xF4ng b\u1ECBa n\u0103m, t\xEAn ng\u01B0\u1EDDi hay ngu\u1ED3n. N\u1EBFu ng\u01B0\u1EDDi d\xF9ng nh\u1EDD ph\u1ED1i \u0111\u1ED3, ch\u1ECDn m\xF3n ch\u1EC9 trong danh s\xE1ch m\xF3n \u0111\u01B0\u1EE3c \u0111\u01B0a v\xE0o v\xE0 tr\u1EA3 v\u1EC1 trong 'action'.";
var cachedManifestPieces = [];
try {
  const manifestPath = path.resolve(__dirname, "public/doll/manifest.json");
  if (fs.existsSync(manifestPath)) {
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    cachedManifestPieces = raw.pieces || [];
  }
} catch (e) {
  console.error("[server] Error reading manifest.json:", e);
}
app.post("/api/nghe", async (req, res) => {
  const timeoutMs = 1e4;
  const abortController = new AbortController();
  const timer = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);
  try {
    const body = req.body || {};
    const garment = body.garment || {};
    const side = body.side;
    const levelName = body["level name"] ?? body.levelName ?? body.level;
    const vibeName = body["vibe name"] ?? body.vibeName ?? body.vibe;
    const worn = body.worn || [];
    const colourName = body["colour name"] ?? body.colourName ?? body.colour;
    const score = body.score;
    const issues = body.issues || [];
    const stars = body.stars;
    const tips = body.tips || [];
    const promptPayload = {
      garment: {
        name: garment.name,
        summary_vi: garment.summary_vi,
        structure: garment.structure,
        must_show: garment.must_show
      },
      side,
      "level name": levelName,
      "vibe name": vibeName,
      worn,
      "colour name": colourName,
      score,
      stars,
      tips,
      issues
    };
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: JSON.stringify(promptPayload),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            line: {
              type: Type.STRING,
              description: "\u0110\xFAng M\u1ED8T c\xE2u ti\u1EBFng Vi\u1EC7t, t\u1ED1i \u0111a 25 ch\u1EEF, gi\u1ECDng Gen Z vui, th\xE2n thi\u1EC7n."
            }
          },
          required: ["line"]
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        abortSignal: abortController.signal
      }
    });
    clearTimeout(timer);
    const text = response.text?.trim() || "";
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        line: text.replace(/^[\s"'{]+line[\s"':]+/, "").replace(/["'}]+$/, "").trim()
      };
    }
    if (!parsed.line) {
      return res.status(500).json({ error: "Empty line in response" });
    }
    return res.json({ line: parsed.line });
  } catch (error) {
    clearTimeout(timer);
    const isTimeout = abortController.signal.aborted || error?.name === "AbortError";
    console.error(
      "[API /api/nghe error]",
      isTimeout ? "Timeout 10s" : error?.message || error
    );
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? "Gateway Timeout" : "Internal Server Error",
      message: error?.message
    });
  }
});
app.post("/api/nghe-chat", async (req, res) => {
  const model = "gemini-3.1-flash-lite";
  const timeoutMs = 12e3;
  const startMs = Date.now();
  let ok = false;
  const abortController = new AbortController();
  const timer = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);
  try {
    const body = req.body || {};
    const question = typeof body.question === "string" ? body.question : "";
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const chapter = typeof body.chapter === "string" ? body.chapter : "ao-giao-linh";
    const side = body.side === "nam" ? "nam" : "nu";
    const spread = typeof body.spread === "number" ? body.spread : 0;
    const outfit = body.outfit || {};
    const gid = gidOf(chapter, side);
    const garment = GARMENTS.find((g) => g.id === gid) || GARMENTS[0];
    const sourceTitles = (garment.sources || []).map((sId) => SOURCES.find((s) => s.id === sId)?.title || sId).filter(Boolean);
    const sidePieces = cachedManifestPieces.filter(
      (p) => !p.side || p.side === side || p.side === "both" || p.side === "all"
    );
    const validPieceIds = /* @__PURE__ */ new Set();
    const wearableList = [];
    for (const p of sidePieces) {
      if (!validPieceIds.has(p.id)) {
        validPieceIds.add(p.id);
        wearableList.push({ id: p.id, name: pieceName(p.id) || p.id });
      }
    }
    const validVibeIds = new Set(VIBES.map((v) => v.id));
    const validColorIds = new Set(COLORS.map((c) => c.id));
    const contextPayload = {
      garment: {
        name: garment.name,
        aliases: garment.aliases,
        period: garment.period,
        summary_vi: garment.summary_vi,
        history_vi: garment.history_vi,
        structure: garment.structure,
        timeline: garment.timeline,
        occasion_rules: garment.occasion_rules,
        dont_confuse_with: garment.dont_confuse_with,
        sources: sourceTitles
      },
      wearable_pieces: wearableList,
      vibes: VIBES.map((v) => ({ id: v.id, name: v.name })),
      levels: LEVELS,
      current_state: {
        chapter,
        side,
        spread,
        outfit
      }
    };
    const promptText = `D\u1EEE LI\u1EC6U:
${JSON.stringify(contextPayload)}

L\u1ECACH S\u1EEC H\u1ED8I THO\u1EA0I G\u1EA6N \u0110\xC2Y:
${JSON.stringify(history)}

C\xC2U H\u1ECEI:
${question}`;
    const response = await ai.models.generateContent({
      model,
      contents: promptText,
      config: {
        systemInstruction: CHAT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "C\xE2u tr\u1EA3 l\u1EDDi c\u1EE7a Ngh\xEA b\u1EB1ng ti\u1EBFng Vi\u1EC7t, t\u1ED1i \u0111a 60 ch\u1EEF."
            },
            action: {
              type: Type.OBJECT,
              description: "H\xE0nh \u0111\u1ED9ng ph\u1ED1i \u0111\u1ED3 n\u1EBFu ng\u01B0\u1EDDi d\xF9ng y\xEAu c\u1EA7u, ho\u1EB7c null.",
              properties: {
                worn: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Danh s\xE1ch piece id \u0111\u01B0\u1EE3c ch\u1ECDn t\u1EEB wearable_pieces."
                },
                vibe: {
                  type: Type.STRING,
                  description: "ID c\u1EE7a vibe \u0111\u01B0\u1EE3c ch\u1ECDn t\u1EEB danh s\xE1ch vibes."
                },
                level: {
                  type: Type.INTEGER,
                  description: "C\u1EA5p \u0111\u1ED9 ph\u1ED1i (1, 2 ho\u1EB7c 3)."
                },
                colorId: {
                  type: Type.STRING,
                  description: "ID m\xE0u s\u1EAFc c\u1EE7a \xE1o."
                }
              }
            }
          },
          required: ["reply"]
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        abortSignal: abortController.signal
      }
    });
    clearTimeout(timer);
    const rawText = response.text?.trim() || "";
    let parsed = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        reply: rawText,
        action: null
      };
    }
    if (!parsed.reply) {
      throw new Error("Missing reply from model");
    }
    let sanitizedAction = null;
    if (parsed.action && typeof parsed.action === "object") {
      const act = parsed.action;
      const cleanWorn = Array.isArray(act.worn) ? act.worn.filter((id) => typeof id === "string" && validPieceIds.has(id)) : void 0;
      const cleanVibe = typeof act.vibe === "string" && validVibeIds.has(act.vibe) ? act.vibe : void 0;
      const cleanLevel = act.level === 1 || act.level === 2 || act.level === 3 ? act.level : void 0;
      const cleanColor = typeof act.colorId === "string" && validColorIds.has(act.colorId) ? act.colorId : void 0;
      if (cleanWorn?.length || cleanVibe !== void 0 || cleanLevel !== void 0 || cleanColor !== void 0) {
        sanitizedAction = {
          worn: cleanWorn,
          vibe: cleanVibe,
          level: cleanLevel,
          colorId: cleanColor
        };
      }
    }
    ok = true;
    return res.json({
      reply: parsed.reply,
      action: sanitizedAction
    });
  } catch (err) {
    clearTimeout(timer);
    return res.status(500).json({
      error: "Error processing chat",
      message: err?.message
    });
  } finally {
    const duration = Date.now() - startMs;
    console.log(`[nghe-chat] model: ${model} | ${duration}ms | ${ok ? "ok" : "fail"}`);
  }
});
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  const args = process.argv.slice(2);
  let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  const portIdx = args.indexOf("--port");
  if (portIdx !== -1 && args[portIdx + 1]) {
    port = parseInt(args[portIdx + 1], 10);
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}
startServer();
