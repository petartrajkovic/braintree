import { Test, TestingModule } from '@nestjs/testing';
import {
  BraintreeModule,
  BraintreeWebhookModule,
  BraintreeSubscriptionCanceled,
  BraintreeSubscriptionExpired,
  BraintreeProvider,
  BraintreeWebhookHandler,
} from './..';
import * as braintree from 'braintree';
import BraintreeWebhookProvider from '../braintree.webhook.provider';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ModulesContainer } from '@nestjs/core/injector/modules-container';

describe('BraintreeWebhookController', async () => {
  it('Decorator methods should be called from WebhookProvider', async () => {
    @BraintreeWebhookHandler()
    class SubscriptionProvider {
      public static called = false;

      @BraintreeSubscriptionCanceled()
      canceled(webhook) {
        //this is a work around the jest spyon reflect issue
        SubscriptionProvider.called = true;
      }

      @BraintreeSubscriptionExpired()
      expired(webhook) {}
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        BraintreeModule.forRoot({
          environment: braintree.Environment.Sandbox,
          merchantId: 'merchantId',
          publicKey: 'publicKey',
          privateKey: 'privateKey',
        }),
        BraintreeWebhookModule,
      ],
      providers: [SubscriptionProvider],
    }).compile();

    const gateway = braintree.connect({
      environment: braintree.Environment.Sandbox,
      merchantId: 'merchantId',
      publicKey: 'publicKey',
      privateKey: 'privateKey',
    });

    const braintreeProvider = module.get<BraintreeProvider>(BraintreeProvider);
    const webhookProvider = module.get<BraintreeWebhookProvider>(
      BraintreeWebhookProvider,
    );

    const webhookNotification = await braintreeProvider.parseWebhook(
      gateway.webhookTesting.sampleNotification(
        braintree.WebhookNotification.Kind.SubscriptionCanceled,
      ),
    );

    webhookProvider.handle(webhookNotification);

    expect(SubscriptionProvider.called).toBeTruthy();
  });

  it('Make sure providers are still instanced with DI', async () => {
    @Injectable()
    class UselessProvider {
      public static called = false;
      callMe() {
        UselessProvider.called = true;
      }
    }

    @BraintreeWebhookHandler()
    class SubscriptionProvider {
      constructor(private readonly uselessProvider: UselessProvider) {
        this.uselessProvider = uselessProvider;
      }

      @BraintreeSubscriptionCanceled()
      canceled() {
        this.uselessProvider.callMe();
      }
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        BraintreeModule.forRoot({
          environment: braintree.Environment.Sandbox,
          merchantId: 'merchantId',
          publicKey: 'publicKey',
          privateKey: 'privateKey',
        }),
        BraintreeWebhookModule,
      ],
      providers: [UselessProvider, SubscriptionProvider],
    }).compile();

    const gateway = braintree.connect({
      environment: braintree.Environment.Sandbox,
      merchantId: 'merchantId',
      publicKey: 'publicKey',
      privateKey: 'privateKey',
    });

    const braintreeProvider = module.get<BraintreeProvider>(BraintreeProvider);
    const webhookProvider = module.get<BraintreeWebhookProvider>(
      BraintreeWebhookProvider,
    );

    const webhookNotification = await braintreeProvider.parseWebhook(
      gateway.webhookTesting.sampleNotification(
        braintree.WebhookNotification.Kind.SubscriptionCanceled,
      ),
    );

    webhookProvider.handle(webhookNotification);

    expect(UselessProvider.called).toBeTruthy();
  });

  it('Instances', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        BraintreeModule.forRoot({
          environment: braintree.Environment.Sandbox,
          merchantId: 'merchantId',
          publicKey: 'publicKey',
          privateKey: 'privateKey',
        }),
        BraintreeWebhookModule,
      ],
    }).compile();

    const braintreeWebhookModule = module.get<BraintreeWebhookModule>(
      BraintreeWebhookModule,
    );

    expect(braintreeWebhookModule.moduleRef).toBeInstanceOf(ModuleRef);
    expect(braintreeWebhookModule.modulesContainer).toBeInstanceOf(
      ModulesContainer,
    );
    expect(braintreeWebhookModule.braintreeWebhookProvider).toBeInstanceOf(
      BraintreeWebhookProvider,
    );
  });
});
