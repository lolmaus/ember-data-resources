/* eslint-disable @typescript-eslint/no-explicit-any */
import { tracked } from '@glimmer/tracking';
import { setOwner } from '@ember/application';
import { helper } from '@ember/component/helper';
import { render } from '@ember/test-helpers';
import settled from '@ember/test-helpers/settled';
import Model, { attr } from '@ember-data/model';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest, setupTest } from 'ember-qunit';

import { findRecord } from 'ember-data-resources';
import { IdRequiredError } from 'ember-data-resources/-private/resources/errors';

import { setupMockData } from './-mock-data';

module('findRecord', function (hooks) {
  setupMockData(hooks);

  module('in js', function (hooks) {
    setupTest(hooks);

    test('it works', async function (assert) {
      class Blog extends Model {
        @attr name: string | undefined;
      }

      this.owner.register('model:blog', Blog);

      class Test {
        @tracked id = 1;
        blog = findRecord<Blog>(this, 'blog', () => this.id);
      }

      let instance = new Test();

      setOwner(instance, this.owner);

      assert.strictEqual(instance.blog.record, undefined);
      await settled();

      assert.false(instance.blog.isLoading, 'isLoading');
      assert.false(instance.blog.isError, 'isError');
      assert.true(instance.blog.hasRan, 'hasRan');
      assert.notOk(instance.blog.error?.message, 'error');
      assert.ok(instance.blog.record instanceof Blog);
      assert.strictEqual(instance.blog.record?.name, 'name:1');

      instance.id = 2;
      assert.false(instance.blog.hasRan, 'hasRan');
      await settled();

      assert.false(instance.blog.isLoading, 'isLoading');
      assert.false(instance.blog.isError, 'isError');
      assert.true(instance.blog.hasRan, 'hasRan');
      assert.notOk(instance.blog.error?.message, 'error');
      assert.ok(instance.blog.record instanceof Blog);
      await settled();

      assert.strictEqual(instance.blog.record?.name, 'name:2');
    });

    test('id happens to be undefined', async function (assert) {
      class Blog extends Model {
        @attr name: string | undefined;
      }

      this.owner.register('model:blog', Blog);

      class Test {
        @tracked id = undefined;
        blog = findRecord<Blog>(this, 'blog', () => this.id);
      }

      let instance = new Test();

      setOwner(instance, this.owner);

      assert.strictEqual(instance.blog.record, undefined);
      await settled();

      assert.false(instance.blog.isLoading, 'isLoading');
      assert.true(instance.blog.isError, 'isError');
      assert.ok(instance.blog.error instanceof IdRequiredError);
      assert.ok(instance.blog.error?.message.includes('blog'), 'error message has modelName');
      assert.notOk(instance.blog.record, 'has no record');
    });
  });

  module('in a template', function (hooks) {
    setupRenderingTest(hooks);

    test('it works', async function (assert) {
      class Blog extends Model {
        @attr name: string | undefined;
      }

      this.owner.register('model:blog', Blog);

      this.setProperties({ id: 1 });

      let yielded: any;

      this.owner.register(
        'helper:capture',
        helper(([data]) => {
          yielded = data;

          return;
        })
      );

      await render(hbs`
        {{#let (find-record 'blog' this.id) as |data|}}
          {{capture data}}
          {{data.record.name}}
        {{/let}}
      `);

      assert.false(yielded.isLoading, 'isLoading');
      assert.strictEqual(yielded.error?.message, undefined);
      assert.true(yielded.hasRan, 'hasRan');
      assert.false(yielded.isError, 'isError');
      assert.strictEqual(yielded.record.name, 'name:1');

      assert.dom().hasText('name:1');

      this.setProperties({ id: 2 });
      await settled();

      assert.false(yielded.isLoading, 'isLoading');
      assert.strictEqual(yielded.error?.message, undefined);
      assert.true(yielded.hasRan, 'hasRan');
      assert.false(yielded.isError, 'isError');
      assert.strictEqual(yielded.record.name, 'name:2');

      assert.dom().hasText('name:2');
    });
  });
});
