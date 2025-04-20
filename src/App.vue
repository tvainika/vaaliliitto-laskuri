<script setup lang="ts">
import kunnat from '@/assets/kunnat.json'

import { reactive, ref, watch } from 'vue'

const selectedKunta = ref('')
const checkedRows = reactive<Record<string, boolean>>({})
const toimielimet = reactive([{ toimielin: 'Kunnanhallitus', koko: 11 }])

const liitto1 = ref(0)
const liitto2 = ref(0)

watch(checkedRows, async (v) => {
  liitto1.value = Object.keys(v)
    .filter((k) => checkedRows[k])
    .reduce((sum, puolue) => sum + kunnat[selectedKunta.value][puolue]['paikat'], 0)
  liitto2.value = Object.keys(kunnat[selectedKunta.value])
    .filter((k) => !checkedRows[k])
    .reduce((sum, puolue) => sum + kunnat[selectedKunta.value][puolue]['paikat'], 0)
})

function orderedKunnat(items) {
  const result = []
  for (const [nimi, value] of Object.entries(items)) {
    result.push({ nimi, ...value })
  }
  return result.sort((a, b) => b['aanet'] - a['aanet'])
}

function dhondt(votes: number, totalVotes: number, seats: number): number {
  if (totalVotes === 0 || seats === 0) return 0

  const vertausluvut1: number[] = []
  const vertausluvut2: number[] = []

  for (let i = 1; i <= seats; i++) {
    vertausluvut1.push(votes / i)
    vertausluvut2.push((totalVotes - votes) / i)
  }

  let allocatedSeats: number = 0
  for (let i = 0; i < seats; i++) {
    if (vertausluvut1[0] > vertausluvut2[0]) {
      allocatedSeats++
      vertausluvut1.shift()
    } else if (vertausluvut1[0] < vertausluvut2[0]) {
      vertausluvut2.shift()
    } else {
      if (seats - i > 1) {
        vertausluvut2.shift()
      }
    }
  }

  return allocatedSeats
}

function addRow() {
  toimielimet.push({ toimielin: '', koko: 0 })
}

const analyysi = ref('')

function laskeAnalyysi() {
  let liitto1Paikat = 0
  let liitto2Paikat = 0

  let arpaRatkaisee = false

  for (const [, value] of Object.entries(toimielimet)) {
    const a = dhondt(liitto1.value, liitto1.value + liitto2.value, value.koko)
    const b = dhondt(liitto2.value, liitto1.value + liitto2.value, value.koko)
    liitto1Paikat += a
    liitto2Paikat += b
    if (a + b < value.koko) {
      arpaRatkaisee = true
    }
  }

  const toimielinosuus = (100.0 * liitto1Paikat) / (liitto1Paikat + liitto2Paikat)
  const valtuutettuosuus = (100 * liitto1.value) / (liitto1.value + liitto2.value)
  const voittava = toimielinosuus > valtuutettuosuus

  let analyysi = `Liitto 1 (${valtuutettuosuus.toFixed(2)} % valtuutetuista) saa ${liitto1Paikat} paikkaa (${toimielinosuus.toFixed(2)} %) ja Liitto 2 saa ${liitto2Paikat} paikkaa.`

  if (arpaRatkaisee || liitto1.value == liitto2.value) {
    analyysi += ' Toimielinten viimeiset paikat arvotaan.'
  } else if (liitto1.value > liitto2.value) {
    if (voittava) {
      analyysi += ' Liitto 1 saa suhteellista etua, ja lisäksi Liitto 1 saa valita puheenjohtajat.'
    } else {
      analyysi += ' Liitto 1 saa suhteellista haittaa, mutta Liitto 1 saa valita puheenjohtajat.'
    }
  } else if (liitto1.value < liitto2.value) {
    if (voittava) {
      analyysi += ' Liitto 1 saa suhteellista etua, mutta Liitto 2 saa valita puheenjohtajat.'
    } else {
      analyysi +=
        ' Liitto 1 saa suhteellista haittaa, ja lisäksi Liitto 2 saa valita puheenjohtajat.'
    }
  }

  return analyysi
}

watch(liitto1, () => {
  analyysi.value = laskeAnalyysi()
})
watch(liitto2, () => {
  analyysi.value = laskeAnalyysi()
})
watch(toimielimet, () => {
  analyysi.value = laskeAnalyysi()
})
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        Valitse kunta:
        <select v-model="selectedKunta">
          <option v-for="(item, key) in kunnat" :key="key" :value="key">
            {{ key }}
          </option>
        </select>

        <table v-if="selectedKunta">
          <caption>
            Paikkajako
            {{
              selectedKunta
            }}
          </caption>

          <thead>
            <tr>
              <th>Ryhmä</th>
              <th>Äänet</th>
              <th>Paikat</th>
              <th>Valitse</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(kunta, index) in orderedKunnat(kunnat[selectedKunta])" :key="index">
              <td>{{ kunta['nimi'] }}</td>
              <td>{{ kunta['aanet'] }}</td>
              <td>{{ kunta['paikat'] }}</td>
              <td>
                <input type="checkbox" v-model="checkedRows[kunta['nimi']]" :value="kunta" />
              </td>
            </tr>
          </tbody>
        </table>

        <span v-if="selectedKunta">
          <hr />
          <p>
            Liitto 1: {{ liitto1 }} valuutettua ({{
              ((100 * liitto1) / (liitto1 + liitto2)).toFixed(2)
            }}
            %)<br />
            vastaan<br />
            Liitto 2: {{ liitto2 }} valtuutettua
            {{ ((100 * liitto2) / (liitto1 + liitto2)).toFixed(2) }} %)
          </p>
          <hr />

          <table border="1">
            <caption>
              Toimielimet
            </caption>
            <thead>
              <tr>
                <th>Toimielin</th>
                <th>Koko</th>
                <th>Liitto&nbsp;1&nbsp;Paikat</th>
                <th>Liitto&nbsp;2&nbsp;Paikat</th>
                <th>Puheenjohtaja</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in toimielimet" :key="index">
                <td>
                  <input type="text" v-model="row.toimielin" placeholder="Toimielin" />
                </td>
                <td>
                  <input type="number" v-model.number="row.koko" placeholder="Koko" />
                </td>
                <td>
                  <span>{{ dhondt(liitto1, liitto1 + liitto2, row.koko) }}</span>
                </td>
                <td>
                  <span> {{ dhondt(liitto2, liitto1 + liitto2, row.koko) }}</span>
                </td>
                <td>
                  <span>{{ liitto1 > liitto2 ? 'Liitto 1' : 'Liitto 2' }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5">
                  <button @click="addRow">Lisää Rivi</button>
                </td>
              </tr>
            </tfoot>
          </table>

          <hr />
          <p>{{ analyysi }}</p>
          <hr />
        </span>
      </nav>
    </div>
  </header>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
