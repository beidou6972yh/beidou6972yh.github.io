// Generated selection; see sources.json and licenses/. SGD portions CC-BY-SA-4.0, CLINC portions CC-BY-3.0.
export const REFERENCE_EXAMPLES=[
  {
    "id": "clinc-train-0",
    "source": "clinc",
    "split": "train",
    "index": 0,
    "utterance": "what expression would i use to say i love you if i were an italian",
    "label": "translate"
  },
  {
    "id": "clinc-train-4",
    "source": "clinc",
    "split": "train",
    "index": 4,
    "utterance": "if i were mongolian, how would i say that i am a tourist",
    "label": "translate"
  },
  {
    "id": "clinc-train-8",
    "source": "clinc",
    "split": "train",
    "index": 8,
    "utterance": "can you tell me how i would say, 'more bread please' in french",
    "label": "translate"
  },
  {
    "id": "clinc-oos_train-0",
    "source": "clinc",
    "split": "oos_train",
    "index": 0,
    "utterance": "how much is an overdraft fee for bank",
    "label": "oos"
  },
  {
    "id": "clinc-oos_train-4",
    "source": "clinc",
    "split": "oos_train",
    "index": 4,
    "utterance": "how much is 1 share of aapl",
    "label": "oos"
  },
  {
    "id": "clinc-oos_train-8",
    "source": "clinc",
    "split": "oos_train",
    "index": 8,
    "utterance": "what is the current market trend",
    "label": "oos"
  },
  {
    "id": "sgd-1_00000-0",
    "source": "sgd",
    "split": "train",
    "dialogue_id": "1_00000",
    "turn": 0,
    "context": "",
    "utterance": "I am feeling hungry so I would like to find a place to eat.",
    "actions": [
      {
        "act": "INFORM_INTENT",
        "canonical_values": [
          "FindRestaurants"
        ],
        "slot": "intent",
        "values": [
          "FindRestaurants"
        ]
      }
    ]
  },
  {
    "id": "sgd-1_00000-10",
    "source": "sgd",
    "split": "train",
    "dialogue_id": "1_00000",
    "turn": 10,
    "context": "If you want to phone them you can at 408-971-8523.",
    "utterance": "Is there some other restaurant which you can suggest?",
    "actions": [
      {
        "act": "REQUEST_ALTS",
        "canonical_values": [],
        "slot": "",
        "values": []
      }
    ]
  },
  {
    "id": "sgd-1_00000-20",
    "source": "sgd",
    "split": "train",
    "dialogue_id": "1_00000",
    "turn": 20,
    "context": "Your booking has been made without errors, but unfortunately they do not have live music.",
    "utterance": "Will I be able to find liquor there? Can you give me the address of their location?",
    "actions": [
      {
        "act": "REQUEST",
        "canonical_values": [],
        "slot": "serves_alcohol",
        "values": []
      },
      {
        "act": "REQUEST",
        "canonical_values": [],
        "slot": "street_address",
        "values": []
      }
    ]
  },
  {
    "id": "sgd-1_00001-10",
    "source": "sgd",
    "split": "train",
    "dialogue_id": "1_00001",
    "turn": 10,
    "context": "I found 2 Restaurants, Olive garden Italian Restaurant at Milpitas",
    "utterance": "Yes, it seems good for me",
    "actions": [
      {
        "act": "SELECT",
        "canonical_values": [],
        "slot": "",
        "values": []
      }
    ]
  },
  {
    "id": "sgd-1_00001-24",
    "source": "sgd",
    "split": "train",
    "dialogue_id": "1_00001",
    "turn": 24,
    "context": "Shall i help you with anything else?",
    "utterance": "No, Thanks",
    "actions": [
      {
        "act": "NEGATE",
        "canonical_values": [],
        "slot": "",
        "values": []
      },
      {
        "act": "THANK_YOU",
        "canonical_values": [],
        "slot": "",
        "values": []
      }
    ]
  },
  {
    "id": "sgd-1_00002-16",
    "source": "sgd",
    "split": "train",
    "dialogue_id": "1_00002",
    "turn": 16,
    "context": "Your table has been reserved.",
    "utterance": "Thank you. That's all I need for now.",
    "actions": [
      {
        "act": "THANK_YOU",
        "canonical_values": [],
        "slot": "",
        "values": []
      },
      {
        "act": "GOODBYE",
        "canonical_values": [],
        "slot": "",
        "values": []
      }
    ]
  }
];
