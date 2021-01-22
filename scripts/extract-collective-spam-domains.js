#!/usr/bin/env node
import '../server/env';

import getUrls from 'get-urls'; // eslint-disable-line node/no-unpublished-import
import { union } from 'lodash';

import { NON_SPAMMERS_DOMAINS, SPAMMERS_DOMAINS } from '../server/lib/spam';
import models, { Op, sequelize } from '../server/models';

const domains = {};

const compareEntries = ([, countA], [, countB]) => {
  return countB <= countA ? -1 : 1;
};

async function run() {
  const collectives = await models.Collective.findAll({
    where: {
      approvedAt: { [Op.is]: null },
      longDescription: { [Op.not]: null },
      createdAt: { [Op.gt]: '2020-06-21' },
    },
    order: [['createdAt', 'DESC']],
    paranoid: false,
  });

  for (const collective of collectives) {
    if (collective.data?.isBanned !== true && collective.data?.seo !== true) {
      continue;
    }
    // console.log(collective.slug, collective.createdAt);

    const content = `${collective.slug} ${collective.name} ${collective.description} ${collective.longDescription} ${collective.website}`;
    const urls = getUrls(content);
    for (const url of urls) {
      const parsedUrl = new URL(url);
      if (NON_SPAMMERS_DOMAINS.includes(parsedUrl.hostname)) {
        continue;
      }

      if (domains[parsedUrl.hostname]) {
        domains[parsedUrl.hostname]++;
      } else {
        domains[parsedUrl.hostname] = 1;
      }
    }
  }

  const entries = Object.entries(domains);
  entries.sort(compareEntries);

  const topDomains = entries.slice(0, 130).map(el => el[0]);

  console.log('Updated SPAMMERS_DOMAINS = ', JSON.stringify(union(SPAMMERS_DOMAINS, topDomains).sort(), null, 2));

  await sequelize.close();
}

run();
