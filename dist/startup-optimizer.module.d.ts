import { DynamicModule } from '@nestjs/common';
import { StartupOptimizerOptions, StartupOptimizerAsyncOptions } from './domain/interfaces';
export declare class StartupOptimizerModule {
    static forRoot(options?: StartupOptimizerOptions): DynamicModule;
    static forRootAsync(asyncOptions: StartupOptimizerAsyncOptions): DynamicModule;
}
